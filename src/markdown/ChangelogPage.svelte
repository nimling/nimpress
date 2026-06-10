<script lang="ts">
  import { onMount, tick, mount, unmount } from 'svelte'
  import type { PageModule, ChangelogEntry } from '../types'
  import { configStore } from '../framework/configStore'
  import RightToc from '../layout/RightToc.svelte'
  import MermaidBlock from './MermaidBlock.svelte'
  import CodeBlock from './CodeBlock.svelte'
  import CodeGroup from './CodeGroup.svelte'
  import Actions from './Actions.svelte'
  import Feature from './Feature.svelte'

  let { page }: { page: PageModule } = $props()

  const entries = $derived<ChangelogEntry[]>(page.changelogEntries ?? [])
  const config = $derived($configStore)
  const effectiveFooter = $derived(page.frontmatter.footer ?? config.footer)
  const background = $derived(page.frontmatter.background)
  const renderBackground = $derived(!!background)
  const tocHeadings = $derived(page.headings ?? [])

  let container: HTMLElement
  let mounted: Array<{ destroy: () => void }> = []
  let openMap = $state<Record<string, boolean>>({})
  let hashSlug = $state<string>('')

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
    if (e.slug && e.slug === hashSlug) return true
    return i === 0
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
    return () => {
      window.removeEventListener('hashchange', onHash)
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
{/if}
<div class="np-page-shell">
  <div class="np-page">
    <article class="np-prose np-changelog" bind:this={container}>
      <h1 class="np-changelog-title">{page.frontmatter.title}</h1>
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
            <span class="np-changelog-version">v{e.version || 'unreleased'}</span>
            <span class="np-changelog-entry-heading">
              <span class="np-changelog-entry-title">{e.title || 'unreleased'}</span>
              {#if e.releaseDate}
                <time class="np-changelog-entry-date" datetime={e.releaseDate}>{formatReleaseDate(e.releaseDate)}</time>
              {/if}
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

<style>
  .np-page-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    width: 100%;
    align-items: stretch;
    position: relative;
    z-index: 1;
  }

  @media (min-width: 1280px) {
    .np-page-shell {
      grid-template-columns: minmax(0, 1fr) 240px;
      gap: 48px;
    }
  }

  .np-toc-rail :global(.np-toc) {
    position: sticky;
    top: calc(var(--np-header-height) + 24px);
    max-height: calc(100vh - var(--np-header-height) - 32px);
    overflow-y: auto;
  }

  .np-page {
    width: 100%;
    padding: 0 32px;
    box-sizing: border-box;
    min-width: 0;
  }

  .np-page :global(.np-prose) {
    max-width: none;
    width: 100%;
  }

  .np-toc-rail {
    min-width: 0;
  }

  @media (max-width: 1279px) {
    .np-toc-rail { display: none; }
  }

  .np-changelog-title {
    margin: 0 -8px 32px;
    font-size: 48px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--np-text-primary);
  }
  @media (max-width: 720px) {
    .np-changelog-title {
      font-size: 36px;
      margin-left: 0;
      margin-right: 0;
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
  .np-changelog-version {
    flex: 0 0 auto;
    font-family: var(--np-font-mono);
    font-size: 13px;
    color: var(--np-brand);
    padding: 2px 10px;
    background-color: color-mix(in srgb, var(--np-brand) 14%, transparent);
    border-radius: var(--np-radius-pill);
    font-weight: 600;
    line-height: 1.4;
  }
  .np-changelog-entry-heading {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .np-changelog-entry-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--np-text-primary);
    letter-spacing: -0.01em;
    line-height: 1.4;
    min-width: 0;
  }
  .np-changelog-entry-date {
    font-size: 12px;
    color: var(--np-text-muted);
    font-family: var(--np-font-mono);
    letter-spacing: 0.02em;
    line-height: 1.2;
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
  }
  .np-changelog-description {
    margin: 0 0 16px;
    color: var(--np-text-secondary);
    font-size: 15px;
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
    position: fixed;
    top: var(--np-header-height, 0px);
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
</style>
