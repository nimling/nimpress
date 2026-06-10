<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { mount, unmount } from 'svelte'
  import type { PageModule } from '../types'
  import { configStore } from '../framework/configStore'
  import { setupHashSpy } from '../framework/hashSpy'
  import RightToc from '../layout/RightToc.svelte'
  import BackToTop from '../layout/BackToTop.svelte'
  import MermaidBlock from './MermaidBlock.svelte'
  import CodeBlock from './CodeBlock.svelte'
  import CodeGroup from './CodeGroup.svelte'
  import Actions from './Actions.svelte'
  import Feature from './Feature.svelte'

  let { page }: { page: PageModule } = $props()

  let container: HTMLElement
  let mounted: Array<{ destroy: () => void }> = []

  const config = $derived($configStore)
  const effectiveFooter = $derived(page.frontmatter.footer ?? config.footer)
  const background = $derived(page.frontmatter.background)
  const renderBackground = $derived(!!background && page.type !== 'hero')
  const issueKind = $derived(
    page.type === 'milestone' || page.type === 'epic' || page.type === 'feature' || page.type === 'bug'
      ? page.type
      : null
  )
  const issueDate = $derived.by(() => {
    const data = page.frontmatter.data as Record<string, unknown> | undefined
    const raw = data?.date
    if (typeof raw !== 'string') return null
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  })
  const tocHeadings = $derived((page.headings ?? []).filter((h) => h.level <= 3))
  const showRail = $derived(!page.frontmatter.noToc && tocHeadings.length > 0)

  function langOf(pre: HTMLElement): string {
    const dataLang = pre.getAttribute('data-lang')
    if (dataLang) return dataLang
    const cls = pre.getAttribute('class')?.split(/\s+/) ?? []
    return cls.find((c) => c !== 'shiki' && c !== 'github-dark') ?? ''
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
      let config: { title?: string; icon?: string; link?: string } = {}
      try {
        config = JSON.parse(el.getAttribute('data-config') ?? '{}')
      } catch {}
      const body = el.querySelector<HTMLElement>('.np-feature-body')
      const bodyHtml = body?.innerHTML ?? ''
      const host = document.createElement('div')
      host.className = 'np-feature-mounted'
      el.replaceWith(host)
      const instance = mount(Feature, {
        target: host,
        props: {
          title: config.title ?? '',
          icon: config.icon ?? '',
          link: config.link ?? '',
          bodyHtml
        }
      })
      mounted.push({ destroy: () => unmount(instance) })
    }
  }

  function decodeBase64(b: string): string {
    try {
      return decodeURIComponent(escape(atob(b)))
    } catch {
      return ''
    }
  }

  onMount(() => {
    void hydrate()
    if (window.location.hash) {
      const id = window.location.hash.slice(1)
      requestAnimationFrame(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' })
      })
    }
    const stopSpy = setupHashSpy({
      root: container,
      selector: 'h1[id], h2[id], h3[id], h4[id]'
    })
    return () => {
      stopSpy()
      for (const m of mounted) m.destroy()
    }
  })

  $effect(() => {
    page.slug
    void hydrate()
  })
</script>

{#if renderBackground}
  <div class="np-page-background" style:background-image={`url('${background}')`}></div>
{/if}
<div class="np-page-shell" class:has-rail={showRail}>
  <div class="np-page">
    {#if issueKind}
      <header class="np-issue-head">
        <span class="np-issue-kind np-issue-kind-{issueKind}">{issueKind}</span>
        {#if issueDate}
          <span class="np-issue-date">
            {String(issueDate.getUTCDate()).padStart(2, '0')}.{String(issueDate.getUTCMonth() + 1).padStart(2, '0')}.{issueDate.getUTCFullYear()}
          </span>
        {/if}
        <h1 class="np-issue-title">{page.frontmatter.title}</h1>
        {#if page.frontmatter.description}
          <p class="np-issue-desc">{page.frontmatter.description}</p>
        {/if}
      </header>
    {/if}
    <article class="np-prose" bind:this={container}>
      {@html page.html}
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
  }

  .np-page-shell.has-rail {
    grid-template-columns: minmax(0, 1fr) min-content;
    gap: 8px;
  }

  @media (min-width: 1280px) {
    .np-page-shell.has-rail {
      gap: 48px;
    }
  }

  .np-page {
    width: 100%;
    padding: 0 32px;
    box-sizing: border-box;
    min-width: 0;
  }

  .np-issue-head {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 0 24px;
    border-bottom: 1px solid var(--np-divider);
    margin: 0 0 32px;
  }
  .np-issue-kind {
    align-self: flex-start;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 3px 10px;
    border-radius: var(--np-radius-pill);
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
    color: var(--np-text-secondary);
  }
  .np-issue-kind-milestone { color: var(--np-brand); border-color: var(--np-brand); background-color: color-mix(in srgb, var(--np-brand) 14%, transparent); }
  .np-issue-kind-epic { color: var(--np-info, var(--np-brand)); border-color: var(--np-info, var(--np-brand)); background-color: color-mix(in srgb, var(--np-info, var(--np-brand)) 14%, transparent); }
  .np-issue-kind-feature { color: var(--np-check, var(--np-brand)); border-color: var(--np-check, var(--np-brand)); background-color: color-mix(in srgb, var(--np-check, var(--np-brand)) 14%, transparent); }
  .np-issue-kind-bug { color: var(--np-danger); border-color: var(--np-danger); background-color: color-mix(in srgb, var(--np-danger) 14%, transparent); }
  .np-issue-date {
    align-self: flex-start;
    font-family: var(--np-font-mono);
    font-size: 12px;
    color: var(--np-text-muted);
    letter-spacing: 0.04em;
  }
  .np-issue-title {
    margin: 8px 0 0;
    font-size: 40px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: var(--np-text-primary);
  }
  .np-issue-desc {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: var(--np-text-secondary);
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

  .np-page-footer {
    margin-top: 96px;
    padding: 32px 0 0;
    border-top: 1px solid var(--np-divider);
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
  .np-page-shell {
    position: relative;
    z-index: 1;
  }
</style>
