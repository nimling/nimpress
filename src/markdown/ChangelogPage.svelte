<script lang="ts">
  import { onMount, tick, mount, unmount } from 'svelte'
  import type { PageModule, ChangelogEntry } from '../types'
  import { configStore } from '../framework/configStore'
  import { setupHashSpy } from '../framework/hashSpy'
  import RightToc from '../layout/RightToc.svelte'
  import BackToTop from '../layout/BackToTop.svelte'
  import MermaidBlock from './MermaidBlock.svelte'
  import CodeBlock from './CodeBlock.svelte'
  import CodeGroup from './CodeGroup.svelte'
  import Actions from './Actions.svelte'
  import Feature from './Feature.svelte'
  import SubscribeDialog from './SubscribeDialog.svelte'

  let { page }: { page: PageModule } = $props()

  const entries = $derived<ChangelogEntry[]>(page.changelogEntries ?? [])
  const config = $derived($configStore)
  const effectiveFooter = $derived(page.frontmatter.footer ?? config.footer)
  const background = $derived(page.frontmatter.background)
  const renderBackground = $derived(!!background)
  const tocHeadings = $derived(page.headings ?? [])
  const feedEnabled = $derived(page.frontmatter.rss === true || page.frontmatter.subscribe === true)
  const feedPath = $derived.by(() => {
    const gated = page.frontmatter.scope !== undefined || page.frontmatter.claim !== undefined
    const prefix = gated ? '/_gated' : ''
    return page.path === '/' ? `${prefix}/rss.xml` : `${prefix}${page.path}/rss.xml`
  })

  $effect(() => {
    if (!feedEnabled) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('format') === 'rss') window.location.replace(feedPath)
  })

  let container: HTMLElement
  let mounted: Array<{ destroy: () => void }> = []
  let openMap = $state<Record<string, boolean>>({})
  let hashSlug = $state<string>('')
  let subscribeOpen = $state(false)

  function keyOf(e: ChangelogEntry, i: number): string {
    return e.slug || e.version || `entry-${i}`
  }

  function formatReleaseDate(iso: string | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const year = d.getUTCFullYear()
    return `${day}.${month}.${year}`
  }

  function isOpen(e: ChangelogEntry, i: number): boolean {
    const k = keyOf(e, i)
    if (k in openMap) return openMap[k]
    return true
  }

  function toggle(e: ChangelogEntry, i: number) {
    const k = keyOf(e, i)
    openMap = { ...openMap, [k]: !isOpen(e, i) }
  }

  function readHash(): string {
    if (typeof window === 'undefined') return ''
    return decodeURIComponent(window.location.hash.slice(1))
  }

  function langOf(pre: HTMLElement): string {
    const dataLang = pre.getAttribute('data-lang')
    if (dataLang) return dataLang
    const cls = pre.getAttribute('class')?.split(/\s+/) ?? []
    return cls.find((c) => c !== 'shiki' && c !== 'github-dark') ?? ''
  }

  function decodeBase64(b: string): string {
    try {
      return decodeURIComponent(escape(atob(b)))
    } catch {
      return ''
    }
  }

  async function hydrate() {
    for (const m of mounted) m.destroy()
    mounted = []
    await tick()
    if (!container) return

    const mermaids = container.querySelectorAll<HTMLDivElement>('.np-mermaid[data-graph]')
    for (const el of Array.from(mermaids)) {
      const graph = decodeBase64(el.dataset.graph ?? '')
      const host = document.createElement('div')
      el.replaceWith(host)
      const instance = mount(MermaidBlock, { target: host, props: { source: graph } })
      mounted.push({ destroy: () => unmount(instance) })
    }

    const groups = container.querySelectorAll<HTMLElement>('.np-code-group')
    for (const group of Array.from(groups)) {
      if (group.parentElement?.classList.contains('np-code-mount')) continue
      const pres = Array.from(group.querySelectorAll<HTMLElement>('pre'))
      if (pres.length === 0) continue
      const tabs = pres.map((pre) => ({
        lang: langOf(pre),
        html: pre.outerHTML,
        raw: pre.querySelector('code')?.innerText ?? ''
      }))
      const host = document.createElement('div')
      host.className = 'np-code-mount'
      group.replaceWith(host)
      const instance = mount(CodeGroup, { target: host, props: { tabs } })
      mounted.push({ destroy: () => unmount(instance) })
    }

    const pres = container.querySelectorAll<HTMLElement>('pre')
    for (const pre of Array.from(pres)) {
      if (pre.closest('.np-code')) continue
      if (pre.closest('.np-code-group')) continue
      if (pre.closest('.np-code-mount')) continue
      if (!pre.classList.contains('shiki') && !pre.hasAttribute('data-lang')) continue
      const lang = langOf(pre)
      const code = pre.querySelector('code')?.innerText ?? ''
      const host = document.createElement('div')
      host.className = 'np-code-mount'
      pre.replaceWith(host)
      const instance = mount(CodeBlock, {
        target: host,
        props: { html: pre.outerHTML, lang, raw: code }
      })
      mounted.push({ destroy: () => unmount(instance) })
    }

    const actionGroups = container.querySelectorAll<HTMLElement>('.np-actions:not(.np-actions-mounted)')
    for (const group of Array.from(actionGroups)) {
      const align = (group.getAttribute('data-align') as 'start' | 'center' | 'end' | null) ?? 'start'
      const anchors = Array.from(group.querySelectorAll<HTMLAnchorElement>('a'))
      if (!anchors.length) continue
      const items = anchors.map((a) => ({
        text: a.textContent?.trim() ?? '',
        link: a.getAttribute('href') ?? '',
        variant: (a.classList.contains('np-action-secondary')
          ? 'secondary'
          : a.classList.contains('np-action-ghost')
          ? 'ghost'
          : 'primary') as 'primary' | 'secondary' | 'ghost'
      }))
      const host = document.createElement('div')
      host.className = 'np-actions-mounted'
      group.replaceWith(host)
      const instance = mount(Actions, { target: host, props: { items, align } })
      mounted.push({ destroy: () => unmount(instance) })
    }

    const features = container.querySelectorAll<HTMLElement>('.np-feature[data-config]:not(.np-feature-mounted)')
    for (const el of Array.from(features)) {
      let cfg: { title?: string; icon?: string; link?: string } = {}
      try {
        cfg = JSON.parse(el.getAttribute('data-config') ?? '{}')
      } catch {}
      const body = el.querySelector<HTMLElement>('.np-feature-body')
      const bodyHtml = body?.innerHTML ?? ''
      const host = document.createElement('div')
      host.className = 'np-feature-mounted'
      el.replaceWith(host)
      const instance = mount(Feature, {
        target: host,
        props: {
          title: cfg.title ?? '',
          icon: cfg.icon ?? '',
          link: cfg.link ?? '',
          bodyHtml
        }
      })
      mounted.push({ destroy: () => unmount(instance) })
    }
  }

  onMount(() => {
    hashSlug = readHash()
    void hydrate()
    if (hashSlug) {
      requestAnimationFrame(() => {
        const el = document.getElementById(hashSlug)
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' })
      })
    }
    const onHash = () => {
      const next = readHash()
      hashSlug = next
      if (!next) return
      requestAnimationFrame(() => {
        const el = document.getElementById(next)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    window.addEventListener('hashchange', onHash)
    const stopSpy = setupHashSpy({
      root: container,
      selector: '.np-changelog-header[id]'
    })
    return () => {
      window.removeEventListener('hashchange', onHash)
      stopSpy()
      for (const m of mounted) m.destroy()
    }
  })

  $effect(() => {
    page.slug
    openMap
    void hydrate()
  })
</script>

{#if renderBackground}
  <div class="np-page-background" style:background-image={`url('${background}')`}></div>
{:else}
  <div class="np-page-backdrop np-page-backdrop-changelog" aria-hidden="true"></div>
{/if}
<div class="np-page-shell" class:has-rail={!page.frontmatter.noToc && tocHeadings.length > 0}>
  <div class="np-page">
    <article class="np-prose np-changelog" bind:this={container}>
      <div class="np-changelog-head">
        <h1 class="np-changelog-title">{page.frontmatter.title}</h1>
        {#if feedEnabled}
          <button type="button" class="np-changelog-subscribe" onclick={() => (subscribeOpen = true)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M6.18 17.82a2.18 2.18 0 1 1-4.36 0 2.18 2.18 0 0 1 4.36 0zM1.82 8.73v3.09c5.72 0 10.36 4.64 10.36 10.36h3.09c0-7.43-6.02-13.45-13.45-13.45zM1.82 2.18v3.09c10.34 0 18.73 8.39 18.73 18.73h3.09C23.64 11.95 13.87 2.18 1.82 2.18z"/>
            </svg>
            Subscribe
          </button>
        {/if}
      </div>
      {#each entries as e, i (keyOf(e, i))}
        {@const open = isOpen(e, i)}
        <section class="np-changelog-section" class:open>
          <button
            type="button"
            id={e.slug}
            class="np-changelog-header"
            aria-expanded={open}
            onclick={() => toggle(e, i)}
          >
            <span class="np-changelog-entry-heading">
              <span class="np-changelog-meta">
                <span class="np-changelog-version">v{e.version || 'unreleased'}</span>
                {#if e.releaseDate}
                  <time class="np-changelog-entry-date" datetime={e.releaseDate}>{formatReleaseDate(e.releaseDate)}</time>
                {/if}
              </span>
              <span class="np-changelog-entry-title">{e.title || 'unreleased'}</span>
            </span>
            <span class="np-changelog-chev" class:open aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
          </button>
          {#if open}
            <div class="np-changelog-body">
              {#if e.description}
                <p class="np-changelog-description">{e.description}</p>
              {/if}
              {@html e.html}
            </div>
          {/if}
        </section>
      {/each}
      {#if entries.length === 0}
        <p class="np-changelog-empty">No entries.</p>
      {/if}
    </article>
    {#if effectiveFooter}
      <footer class="np-page-footer">{effectiveFooter}</footer>
    {/if}
    <div class="np-page-tail"></div>
  </div>
  {#if !page.frontmatter.noToc && tocHeadings.length > 0}
    <div class="np-toc-rail">
      <RightToc headings={tocHeadings} />
    </div>
  {/if}
</div>

<BackToTop />

{#if subscribeOpen}
  <SubscribeDialog
    title={page.frontmatter.title}
    {feedPath}
    emailEnabled={page.frontmatter.subscribe === true}
    onClose={() => (subscribeOpen = false)}
  />
{/if}

<style>
  .np-page-shell {
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .np-page-shell.has-rail .np-toc-rail {
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(50% + min(50%, var(--np-content-max, 1024px) / 2) + 32px);
    width: var(--np-toc-width);
  }

  .np-toc-rail :global(.np-toc) {
    position: sticky;
    top: calc(var(--np-header-height) + 24px);
    max-height: calc(100vh - var(--np-header-height) - 32px);
    overflow-y: auto;
  }

  .np-page {
    display: block;
    width: 100%;
    max-width: var(--np-content-max, 1024px);
    margin: 0 auto;
    padding: 96px 32px 0;
    box-sizing: border-box;
    min-width: 0;
  }

  .np-page :global(.np-prose) {
    width: 100%;
  }

  .np-toc-rail {
    min-width: 0;
  }

  @media (max-width: 1535px) {
    .np-page-shell.has-rail .np-toc-rail {
      display: none;
    }
  }

  .np-changelog-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin: 0 -8px 32px;
  }

  .np-changelog-title {
    margin: 0;
    font-size: 48px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--np-text-primary);
  }

  .np-changelog-subscribe {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-pill);
    background: none;
    color: var(--np-text-muted);
    font-size: 13px;
    padding: 6px 14px;
    cursor: pointer;
    white-space: nowrap;
  }
  .np-changelog-subscribe:hover {
    color: var(--np-text-primary);
    border-color: var(--np-brand);
  }

  @media (max-width: 720px) {
    .np-changelog-head {
      margin-left: 0;
      margin-right: 0;
    }
    .np-changelog-title {
      font-size: 36px;
    }
  }

  .np-changelog-section + .np-changelog-section {
    margin-top: 24px;
  }

  .np-changelog-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    background: none;
    border: 0;
    border-bottom: 1px solid var(--np-divider);
    color: var(--np-text-primary);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    scroll-margin-top: calc(var(--np-header-height) + 16px);
  }
  .np-changelog-header:focus { outline: none; }
  .np-changelog-header:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 4px;
    border-radius: var(--np-radius-sm);
  }
  .np-changelog-header:hover .np-changelog-chev,
  .np-changelog-header:focus-visible .np-changelog-chev {
    color: var(--np-text-primary);
  }
  .np-changelog-entry-heading {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .np-changelog-meta {
    display: flex;
    align-items: baseline;
    gap: 14px;
    min-width: 0;
  }
  .np-changelog-version {
    font-family: var(--np-font-mono);
    font-size: 24px;
    color: var(--np-brand);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .np-changelog-entry-date {
    font-size: 14px;
    color: var(--np-text-muted);
    font-family: var(--np-font-mono);
    letter-spacing: 0.04em;
    line-height: 1;
  }
  .np-changelog-entry-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--np-text-primary);
    letter-spacing: -0.015em;
    line-height: 1.2;
    min-width: 0;
  }
  .np-changelog-chev {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: var(--np-text-muted);
    transition: transform 0.15s ease, color 0.15s ease;
  }
  .np-changelog-chev.open {
    transform: rotate(90deg);
  }

  .np-changelog-body {
    padding: 16px 0 8px;
    font-size: 13.5px;
    line-height: 1.6;
  }
  .np-changelog-body :global(h1) {
    font-size: 28px;
    line-height: 1.2;
    font-weight: 700;
    margin: 80px 0 18px;
    color: var(--np-text-primary);
    border-top: 0;
    padding-top: 0;
    letter-spacing: -0.015em;
  }
  .np-changelog-body :global(h1::before) { display: none; }
  .np-changelog-body :global(h2) {
    font-size: 23px;
    line-height: 1.25;
    font-weight: 700;
    margin: 64px 0 14px;
    color: var(--np-text-primary);
    border-top: 0;
    padding-top: 0;
    letter-spacing: -0.01em;
  }
  .np-changelog-body :global(h2::before) { display: none; }
  .np-changelog-body :global(h3) {
    font-size: 19px;
    line-height: 1.3;
    font-weight: 600;
    margin: 52px 0 12px;
    color: var(--np-text-primary);
    border-left: 0;
    padding-left: 0;
    margin-left: 0;
    letter-spacing: -0.005em;
  }
  .np-changelog-body :global(h4) {
    font-size: 16px;
    line-height: 1.35;
    font-weight: 600;
    margin: 40px 0 10px;
    color: var(--np-text-primary);
  }
  .np-changelog-body :global(h5),
  .np-changelog-body :global(h6) {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 32px 0 8px;
    color: var(--np-text-secondary);
  }
  .np-changelog-body :global(h1):first-child,
  .np-changelog-body :global(h2):first-child,
  .np-changelog-body :global(h3):first-child,
  .np-changelog-body :global(h4):first-child,
  .np-changelog-body :global(h5):first-child,
  .np-changelog-body :global(h6):first-child {
    margin-top: 0;
  }
  .np-changelog-body :global(p),
  .np-changelog-body :global(li) {
    font-size: 15px;
    line-height: 1.65;
  }
  .np-changelog-body :global(ul),
  .np-changelog-body :global(ol) {
    margin: 14px 0;
  }
  .np-changelog-body :global(code) {
    font-size: 13.5px;
  }
  .np-changelog-description {
    margin: 0 0 16px;
    color: var(--np-text-secondary);
    font-size: 14.5px;
    line-height: 1.6;
  }

  .np-changelog-empty {
    color: var(--np-text-muted);
    font-style: italic;
  }

  .np-page-footer {
    margin-top: 96px;
    padding: 32px 0 0;
    border-top: 0;
    text-align: center;
    color: var(--np-text-faint);
    font-size: 13px;
    white-space: pre-line;
  }
  .np-page-tail {
    height: 25vh;
    min-height: 160px;
  }
  .np-page-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: min(520px, 80vh);
    background-size: cover;
    background-position: top center;
    background-repeat: no-repeat;
    opacity: 0.55;
    pointer-events: none;
    z-index: 0;
    mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
  }
  .np-page-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 0;
    mask-image: linear-gradient(to bottom, #000 45%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, #000 45%, transparent 100%);
  }
  .np-page-backdrop-changelog {
    height: min(420px, 55vh);
    background:
      radial-gradient(ellipse 60% 80% at 70% 0%, color-mix(in srgb, var(--np-check, var(--np-brand)) 16%, transparent) 0%, transparent 70%),
      linear-gradient(to bottom, color-mix(in srgb, var(--np-check, var(--np-brand)) 8%, var(--np-bg)) 0%, var(--np-bg) 100%);
  }

</style>
