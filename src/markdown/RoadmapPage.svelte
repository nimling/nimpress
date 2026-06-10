<script lang="ts">
  import { onMount, tick, mount, unmount } from 'svelte'
  import type { PageModule, RoadmapEntry, RoadmapKind } from '../types'
  import { configStore } from '../framework/configStore'
  import { setupHashSpy } from '../framework/hashSpy'
  import BackToTop from '../layout/BackToTop.svelte'
  import RightToc from '../layout/RightToc.svelte'
  import MermaidBlock from './MermaidBlock.svelte'
  import CodeBlock from './CodeBlock.svelte'
  import CodeGroup from './CodeGroup.svelte'

  let { page }: { page: PageModule } = $props()

  const entries = $derived<RoadmapEntry[]>(page.roadmapEntries ?? [])
  const config = $derived($configStore)
  const effectiveFooter = $derived(page.frontmatter.footer ?? config.footer)
  const background = $derived(page.frontmatter.background)
  const renderBackground = $derived(!!background)
  const tocHeadings = $derived(page.headings ?? [])

  let container: HTMLElement
  let hoverId = $state<string | null>(null)
  let hoverSide = $state<'left' | 'right'>('right')
  let entryHtmlMounts: Array<{ destroy: () => void }> = []

  const ordered = $derived(orderEntries(entries))
  const boundary = $derived(findBoundary(ordered))
  const activeHover = $derived(ordered.find((e) => e.id === hoverId) ?? null)

  function orderEntries(list: RoadmapEntry[]): RoadmapEntry[] {
    return [...list].sort((a, b) => {
      const ad = a.targetDate ?? ''
      const bd = b.targetDate ?? ''
      if (ad === bd) return a.id.localeCompare(b.id)
      if (!ad) return -1
      if (!bd) return 1
      return bd.localeCompare(ad)
    })
  }

  function findBoundary(list: RoadmapEntry[]): number {
    for (let i = 0; i < list.length; i++) {
      if (list[i].status !== 'shipped') continue
      return i
    }
    return list.length
  }

  function kindLabel(kind: RoadmapKind): string {
    return kind.charAt(0).toUpperCase() + kind.slice(1)
  }

  function formatDate(iso: string | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const year = d.getUTCFullYear()
    return `${day}.${month}.${year}`
  }

  function sideForIndex(i: number): 'left' | 'right' {
    return i % 2 === 0 ? 'left' : 'right'
  }

  function onCardEnter(entry: RoadmapEntry, side: 'left' | 'right') {
    hoverId = entry.id
    hoverSide = side === 'left' ? 'right' : 'left'
  }

  function onCardLeave() {
    hoverId = null
  }

  async function hydrate() {
    for (const m of entryHtmlMounts) m.destroy()
    entryHtmlMounts = []
    await tick()
    if (!container) return
    const mermaids = container.querySelectorAll<HTMLDivElement>('.np-mermaid[data-graph]')
    for (const el of Array.from(mermaids)) {
      const raw = el.dataset.graph ?? ''
      let graph = ''
      try {
        graph = decodeURIComponent(escape(atob(raw)))
      } catch {}
      const host = document.createElement('div')
      el.replaceWith(host)
      const instance = mount(MermaidBlock, { target: host, props: { source: graph } })
      entryHtmlMounts.push({ destroy: () => unmount(instance) })
    }
    const groups = container.querySelectorAll<HTMLElement>('.np-code-group')
    for (const group of Array.from(groups)) {
      if (group.parentElement?.classList.contains('np-code-mount')) continue
      const pres = Array.from(group.querySelectorAll<HTMLElement>('pre'))
      if (pres.length === 0) continue
      const tabs = pres.map((pre) => ({
        lang: pre.getAttribute('data-lang') ?? '',
        html: pre.outerHTML,
        raw: pre.querySelector('code')?.innerText ?? ''
      }))
      const host = document.createElement('div')
      host.className = 'np-code-mount'
      group.replaceWith(host)
      const instance = mount(CodeGroup, { target: host, props: { tabs } })
      entryHtmlMounts.push({ destroy: () => unmount(instance) })
    }
    const pres = container.querySelectorAll<HTMLElement>('pre')
    for (const pre of Array.from(pres)) {
      if (pre.closest('.np-code-mount')) continue
      if (!pre.classList.contains('shiki') && !pre.hasAttribute('data-lang')) continue
      const lang = pre.getAttribute('data-lang') ?? ''
      const code = pre.querySelector('code')?.innerText ?? ''
      const host = document.createElement('div')
      host.className = 'np-code-mount'
      pre.replaceWith(host)
      const instance = mount(CodeBlock, {
        target: host,
        props: { html: pre.outerHTML, lang, raw: code }
      })
      entryHtmlMounts.push({ destroy: () => unmount(instance) })
    }
  }

  onMount(() => {
    void hydrate()
    requestAnimationFrame(() => {
      if (window.location.hash) {
        const id = decodeURIComponent(window.location.hash.slice(1))
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'center' })
          return
        }
      }
      const boundaryEl = container?.querySelector<HTMLElement>('.np-roadmap-boundary')
      if (boundaryEl) boundaryEl.scrollIntoView({ behavior: 'auto', block: 'center' })
      else window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' })
    })
    const stopSpy = setupHashSpy({ root: container, selector: '.np-roadmap-row[id]' })
    return () => {
      stopSpy()
      for (const m of entryHtmlMounts) m.destroy()
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
<div class="np-page-shell">
  <div class="np-page">
    <article class="np-prose np-roadmap" bind:this={container}>
      <h1 class="np-roadmap-title">{page.frontmatter.title}</h1>
      <div class="np-roadmap-track">
        <span class="np-roadmap-spine" aria-hidden="true"></span>
        {#each ordered as e, i (e.id)}
          {@const side = sideForIndex(i)}
          {#if i === boundary}
            <div class="np-roadmap-boundary" aria-hidden="true">
              <span class="np-roadmap-boundary-label">Today</span>
            </div>
          {/if}
          <div
            class="np-roadmap-row np-roadmap-row-{side} np-roadmap-row-{e.status} np-roadmap-row-{e.kind}"
            id={e.id}
          >
            <button
              type="button"
              class="np-roadmap-card"
              onmouseenter={() => onCardEnter(e, side)}
              onmouseleave={onCardLeave}
              onfocus={() => onCardEnter(e, side)}
              onblur={onCardLeave}
            >
              <span class="np-roadmap-kind">{kindLabel(e.kind)}</span>
              <span class="np-roadmap-card-title">{e.title}</span>
              {#if e.description}
                <span class="np-roadmap-card-desc">{e.description}</span>
              {/if}
              <span class="np-roadmap-card-date" data-status={e.status}>
                {#if e.status === 'shipped' && e.changelog.length}
                  Shipped {formatDate(e.changelog[0].releaseDate)}
                {:else if e.targetDate}
                  Target {formatDate(e.targetDate)}
                {:else}
                  Planned
                {/if}
              </span>
            </button>
          </div>
        {/each}
        {#if ordered.length === boundary}
          <div class="np-roadmap-boundary np-roadmap-boundary-end" aria-hidden="true">
            <span class="np-roadmap-boundary-label">Today</span>
          </div>
        {/if}
        {#if entries.length === 0}
          <p class="np-roadmap-empty">No roadmap entries.</p>
        {/if}
      </div>
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

{#if activeHover}
  <aside class="np-roadmap-aside np-roadmap-aside-{hoverSide}" aria-live="polite">
    <header class="np-roadmap-aside-head">
      <span class="np-roadmap-kind">{kindLabel(activeHover.kind)}</span>
      <h2>{activeHover.title}</h2>
      {#if activeHover.targetDate}
        <span class="np-roadmap-aside-date">{formatDate(activeHover.targetDate)}</span>
      {/if}
    </header>
    {#if activeHover.description}
      <p class="np-roadmap-aside-desc">{activeHover.description}</p>
    {/if}
    {#if activeHover.html}
      <div class="np-roadmap-aside-body">{@html activeHover.html}</div>
    {/if}
    {#if activeHover.changelog.length}
      <ul class="np-roadmap-aside-changelog">
        {#each activeHover.changelog as ref (ref.slug)}
          <li>
            <span class="np-roadmap-aside-version">v{ref.version}</span>
            <span class="np-roadmap-aside-ref-title">{ref.title}</span>
            {#if ref.releaseDate}
              <span class="np-roadmap-aside-ref-date">{formatDate(ref.releaseDate)}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </aside>
{/if}

<BackToTop />

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
  @media (max-width: 1279px) {
    .np-toc-rail { display: none; }
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
  .np-roadmap-title {
    margin: 0 -8px 32px;
    font-size: 48px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--np-text-primary);
  }
  @media (max-width: 720px) {
    .np-roadmap-title {
      font-size: 36px;
      margin-left: 0;
      margin-right: 0;
    }
  }
  .np-roadmap-track {
    position: relative;
    padding: 32px 0;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .np-roadmap-spine {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 0;
    border-left: 2px dashed var(--np-border);
    transform: translateX(-50%);
  }
  .np-roadmap-boundary {
    position: relative;
    text-align: center;
    margin: 16px 0;
  }
  .np-roadmap-boundary::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 18px;
    height: 18px;
    background-color: var(--np-brand);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--np-brand) 18%, transparent);
  }
  .np-roadmap-boundary-label {
    display: inline-block;
    position: relative;
    background-color: var(--np-bg);
    padding: 4px 14px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: var(--np-brand);
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-brand);
  }
  .np-roadmap-row {
    display: grid;
    grid-template-columns: 1fr 24px 1fr;
    align-items: center;
    gap: 16px;
  }
  .np-roadmap-card {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 18px 22px;
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    color: var(--np-text-primary);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    width: 100%;
    box-sizing: border-box;
  }
  .np-roadmap-card:hover,
  .np-roadmap-card:focus-visible {
    border-color: var(--np-brand);
    transform: translateY(-1px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.32);
    outline: none;
  }
  .np-roadmap-row-left .np-roadmap-card { grid-column: 1; justify-self: end; }
  .np-roadmap-row-right .np-roadmap-card { grid-column: 3; justify-self: start; }
  .np-roadmap-card-title {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .np-roadmap-card-desc {
    font-size: 13px;
    color: var(--np-text-secondary);
    line-height: 1.55;
  }
  .np-roadmap-card-date {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--np-text-muted);
    padding: 2px 10px;
    border-radius: var(--np-radius-pill);
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
  }
  .np-roadmap-card-date[data-status='shipped'] {
    color: var(--np-check);
    border-color: var(--np-check);
    background-color: color-mix(in srgb, var(--np-check) 14%, transparent);
  }
  .np-roadmap-card-date[data-status='in_progress'] {
    color: var(--np-brand);
    border-color: var(--np-brand);
    background-color: color-mix(in srgb, var(--np-brand) 14%, transparent);
  }
  .np-roadmap-kind {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--np-text-muted);
  }
  .np-roadmap-row-milestone .np-roadmap-kind { color: var(--np-brand); }
  .np-roadmap-row-epic .np-roadmap-kind { color: var(--np-info); }
  .np-roadmap-row-bug .np-roadmap-kind { color: var(--np-danger); }

  .np-roadmap-aside {
    position: fixed;
    top: calc(var(--np-header-height) + 24px);
    width: min(380px, 36vw);
    max-height: calc(100vh - var(--np-header-height) - 48px);
    overflow-y: auto;
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    padding: 20px 22px;
    z-index: 40;
    pointer-events: none;
  }
  .np-roadmap-aside-left { left: 24px; }
  .np-roadmap-aside-right { right: 24px; }
  .np-roadmap-aside-head h2 {
    margin: 4px 0 6px;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .np-roadmap-aside-date {
    font-size: 11px;
    color: var(--np-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .np-roadmap-aside-desc {
    margin: 0 0 12px;
    color: var(--np-text-secondary);
    font-size: 13px;
    line-height: 1.55;
  }
  .np-roadmap-aside-body :global(p) { margin: 0 0 10px; font-size: 13px; }
  .np-roadmap-aside-changelog {
    list-style: none;
    padding: 0;
    margin: 12px 0 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .np-roadmap-aside-changelog li {
    display: flex;
    gap: 8px;
    font-size: 12px;
    align-items: baseline;
  }
  .np-roadmap-aside-version {
    font-family: var(--np-font-mono);
    color: var(--np-brand);
    font-weight: 600;
  }
  .np-roadmap-aside-ref-title {
    flex: 1 1 auto;
    color: var(--np-text-primary);
  }
  .np-roadmap-aside-ref-date {
    color: var(--np-text-muted);
    font-family: var(--np-font-mono);
  }

  @media (max-width: 900px) {
    .np-roadmap-track { padding: 16px 0; }
    .np-roadmap-spine { left: 18px; }
    .np-roadmap-row {
      grid-template-columns: 36px 1fr;
      gap: 12px;
    }
    .np-roadmap-row-left .np-roadmap-card,
    .np-roadmap-row-right .np-roadmap-card {
      grid-column: 2;
      justify-self: stretch;
    }
    .np-roadmap-aside { display: none; }
  }

  .np-roadmap-empty {
    color: var(--np-text-muted);
    font-style: italic;
    text-align: center;
    padding: 32px;
  }

  .np-page-footer {
    margin-top: 96px;
    padding: 32px 0 0;
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
