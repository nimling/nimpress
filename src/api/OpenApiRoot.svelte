<script lang="ts">
  import { onMount, setContext } from 'svelte'
  import Operation from './Operation.svelte'
  import Schema from './Schema.svelte'
  import TryDialog from './TryDialog.svelte'
  import BackToTop from '../layout/BackToTop.svelte'
  import { configStore } from '../framework/configStore'
  import { setupHashSpy } from '../framework/hashSpy'
  import { isFlattenedSpec, type FlattenedSpec } from './types'
  import { SCHEMAS_CONTEXT, type SchemaRegistry } from './refs'
  import type { Frontmatter } from '../types'

  let {
    spec,
    title,
    frontmatter
  }: { spec: unknown; title?: string; frontmatter?: Frontmatter } = $props()

  const config = $derived($configStore)
  const effectiveFooter = $derived(frontmatter?.footer ?? config.footer)

  const flat = $derived<FlattenedSpec | null>(isFlattenedSpec(spec) ? spec : null)
  const serverUrl = $derived(flat?.servers?.[0]?.url ?? '')
  const servers = $derived(flat?.servers ?? [])
  const securitySchemes = $derived(flat?.securitySchemes ?? {})
  const schemas = $derived<SchemaRegistry>(flat?.schemas ?? {})
  setContext<() => SchemaRegistry>(SCHEMAS_CONTEXT, () => schemas)

  function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown'
  }
  const specId = $derived(slugify(frontmatter?.spec || flat?.title || title || ''))

  $effect(() => {
    if (typeof localStorage === 'undefined') return
    if (!flat) return
    const version = flat.version || 'unknown'
    const markerKey = `nimpress-try-cache-version-${specId}`
    const seen = localStorage.getItem(markerKey)
    if (seen === version) return
    const keepPrefix = `nimpress-try-cache-v1-${specId}-`
    const keepKey = `${keepPrefix}${version}`
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (k && k.startsWith(keepPrefix) && k !== keepKey) {
          localStorage.removeItem(k)
        }
      }
      localStorage.setItem(markerKey, version)
    } catch {}
  })

  let mounted = $state<Set<string>>(new Set())
  let observer: IntersectionObserver | null = null
  const orderedOpKeys = $derived(
    flat ? flat.tags.flatMap((t) => t.operations.map((op) => `operation/${op.id}`)) : []
  )

  const WINDOW_BEFORE = 6
  const WINDOW_AFTER = 6
  const ROOT_MARGIN = '600px 0px'

  const hydrateQueue: string[] = []
  const queued = new Set<string>()
  let drainScheduled = false

  function markMounted(id: string) {
    if (mounted.has(id)) return
    const next = new Set(mounted)
    next.add(id)
    mounted = next
  }

  function enqueueHydrate(id: string) {
    if (mounted.has(id) || queued.has(id)) return
    queued.add(id)
    hydrateQueue.push(id)
    scheduleDrain()
  }

  function scheduleDrain() {
    if (drainScheduled) return
    drainScheduled = true
    const run = () => {
      drainScheduled = false
      const next = hydrateQueue.shift()
      if (!next) return
      queued.delete(next)
      markMounted(next)
      if (hydrateQueue.length) scheduleDrain()
    }
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
    if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(run, { timeout: 200 })
    else requestAnimationFrame(run)
  }

  function seedInitialWindow() {
    const keys = orderedOpKeys
    if (!keys.length) return
    const hash = window.location.hash.slice(1)
    const anchorIndex = hash.startsWith('operation/') ? keys.indexOf(hash) : -1
    const center = anchorIndex >= 0 ? anchorIndex : 0
    const start = Math.max(0, center - WINDOW_BEFORE)
    const end = Math.min(keys.length - 1, center + WINDOW_AFTER)
    for (let i = start; i <= end; i++) markMounted(keys[i])
  }

  function scrollToHash() {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    if (hash.startsWith('operation/')) markMounted(hash)
    requestAnimationFrame(() => {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' })
        el.classList.add('np-flash')
        setTimeout(() => el.classList.remove('np-flash'), 1200)
      }
    })
  }

  let endpointsCollapsed = $state(false)
  let collapsedTags = $state<Set<string>>(new Set())
  let schemasOpen = $state(true)

  const allCollapsed = $derived(
    flat ? flat.tags.every((t) => collapsedTags.has(t.name)) && !schemasOpen : false
  )

  function toggleEndpoints() {
    endpointsCollapsed = !endpointsCollapsed
    window.dispatchEvent(new CustomEvent('np-api-toggle-all', { detail: { collapsed: endpointsCollapsed } }))
  }

  function toggleAll() {
    const collapse = !allCollapsed
    collapsedTags = collapse ? new Set((flat?.tags ?? []).map((t) => t.name)) : new Set()
    schemasOpen = !collapse
    endpointsCollapsed = collapse
    window.dispatchEvent(new CustomEvent('np-api-toggle-all', { detail: { collapsed: collapse } }))
  }

  function toggleTag(name: string) {
    const next = new Set(collapsedTags)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    collapsedTags = next
  }

  onMount(() => {
    seedInitialWindow()
    scrollToHash()
    const onHash = () => scrollToHash()
    window.addEventListener('hashchange', onHash)
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              const target = e.target as HTMLElement
              const id = target.dataset.opid
              if (id) {
                enqueueHydrate(id)
                observer?.unobserve(target)
              }
            }
          }
        },
        { rootMargin: ROOT_MARGIN }
      )
      document.querySelectorAll<HTMLElement>('.np-op-lazy').forEach((el) => {
        const id = el.dataset.opid
        if (id) observer!.observe(el)
      })
    } else {
      document.querySelectorAll<HTMLElement>('.np-op-lazy').forEach((el) => {
        const id = el.dataset.opid
        if (id) enqueueHydrate(id)
      })
    }
    const stopSpy = setupHashSpy({
      selector: '[id^="operation/"], [id^="tag/"], [id^="schema/"]'
    })
    return () => {
      window.removeEventListener('hashchange', onHash)
      stopSpy()
      observer?.disconnect()
      observer = null
    }
  })

  $effect(() => {
    spec
    if (flat) requestAnimationFrame(scrollToHash)
  })
</script>

{#if flat}
  <div class="np-api">
    <header class="np-api-header np-prose">
      <div class="np-api-title-row">
        <h1>{title ?? flat.title}</h1>
        {#if flat.version}<span class="np-api-version">v{flat.version}</span>{/if}
        <div class="np-api-actions">
          <button type="button" class="np-api-collapse-all" onclick={toggleEndpoints} title={endpointsCollapsed ? 'Expand every endpoint card' : 'Collapse every endpoint card'}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              {#if endpointsCollapsed}
                <polyline points="6 9 12 15 18 9" />
              {:else}
                <polyline points="18 15 12 9 6 15" />
              {/if}
            </svg>
            <span>{endpointsCollapsed ? 'Expand endpoints' : 'Collapse endpoints'}</span>
          </button>
          <button type="button" class="np-api-collapse-all" onclick={toggleAll} title={allCollapsed ? 'Expand every group' : 'Collapse every group'}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              {#if allCollapsed}
                <polyline points="6 9 12 15 18 9" />
              {:else}
                <polyline points="18 15 12 9 6 15" />
              {/if}
            </svg>
            <span>{allCollapsed ? 'Expand all' : 'Collapse all'}</span>
          </button>
        </div>
      </div>
      {#if servers.length}
        <table class="np-api-servers-table">
          <thead>
            <tr>
              <th>Base URL</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {#each servers as s, i (s.url || `srv-${i}`)}
              <tr>
                <td><code>{s.url}</code></td>
                <td>{s.description ?? ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
      {#if flat.description_html}
        <div class="np-api-desc">{@html flat.description_html}</div>
      {:else if flat.description}
        <p class="np-api-desc">{flat.description}</p>
      {/if}
    </header>

    {#each flat.tags as tag, ti (tag.name || `tag-${ti}`)}
      {@const tagCollapsed = collapsedTags.has(tag.name)}
      <section class="np-tag-card" class:collapsed={tagCollapsed}>
        <button type="button" class="np-tag-head np-tag-toggle" id={`tag/${tag.name}`} aria-expanded={!tagCollapsed} onclick={() => toggleTag(tag.name)}>
          <span class="np-tag-chev" class:open={!tagCollapsed} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </span>
          <h2>{tag.name}</h2>
          <span class="np-tag-count">{tag.operations.length} endpoint{tag.operations.length === 1 ? '' : 's'}</span>
        </button>
        <div class="np-tag-ops">
          {#each tag.operations as op, oi (op.id || `op-${ti}-${oi}`)}
            {@const opKey = `operation/${op.id}`}
            {#if mounted.has(opKey)}
              <Operation {op} {serverUrl} {servers} {securitySchemes} collapsedDefault={endpointsCollapsed} specVersion={flat.version} {specId} />
            {:else}
              <div
                class="np-op-lazy"
                data-opid={opKey}
                id={opKey}
              >
                <div class="np-op-lazy-row">
                  <span class={`np-op-lazy-method np-op-lazy-method-${op.method.toLowerCase()}`}>{op.method}</span>
                  <code class="np-op-lazy-path">{op.path}</code>
                </div>
                <div class="np-op-lazy-summary">{op.summary}</div>
              </div>
            {/if}
          {/each}
        </div>
      </section>
    {/each}

    {#if Object.keys(flat.schemas).length}
      <section class="np-schemas-card" class:open={schemasOpen}>
        <button type="button" class="np-tag-head np-schemas-toggle" aria-expanded={schemasOpen} onclick={() => (schemasOpen = !schemasOpen)}>
          <span class="np-schemas-chev" class:open={schemasOpen} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </span>
          <h2>Schemas</h2>
          <span class="np-tag-count">{Object.keys(flat.schemas).length} model{Object.keys(flat.schemas).length === 1 ? '' : 's'}</span>
        </button>
        {#if schemasOpen}
          <div class="np-schemas-grid">
            {#each Object.entries(flat.schemas) as [name, schema], si (name || `schema-${si}`)}
              <div id={`schema/${name}`} class="np-schema-block">
                <h3>{name}</h3>
                <Schema {schema} />
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    {#if effectiveFooter}
      <footer class="np-page-footer">{effectiveFooter}</footer>
    {/if}
  </div>

  <TryDialog
    operations={flat.tags.flatMap((t) => t.operations)}
    securitySchemes={flat.securitySchemes}
    servers={flat.servers ?? []}
    specVersion={flat.version}
    {specId}
  />
  <BackToTop />
{:else}
  <p>OpenAPI spec missing</p>
{/if}

<style>
  .np-api {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px;
    box-sizing: border-box;
  }
  .np-api-header {
    padding: 0;
    margin-bottom: 40px;
    border: 0;
    background-color: transparent;
    max-width: none;
  }
  .np-api-title-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 12px;
  }
  .np-api-actions {
    margin-left: auto;
    display: inline-flex;
    gap: 8px;
  }
  .np-api-collapse-all {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--np-text-secondary);
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-pill);
    padding: 6px 14px;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
  }
  .np-api-collapse-all:hover {
    color: var(--np-text-primary);
    border-color: var(--np-brand);
  }
  .np-api-collapse-all:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 2px;
  }

  h1 {
    font-size: 34px;
    line-height: 1.2;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.015em;
    color: var(--np-brand);
  }
  .np-api-version {
    font-family: var(--np-font-mono);
    font-size: 12px;
    color: var(--np-text-muted);
    padding: 2px 8px;
    border-radius: var(--np-radius-pill);
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
  }
  .np-api-desc {
    color: var(--np-text-primary);
    font-size: 15px;
    line-height: 1.7;
    margin: 24px 0 0;
  }
  .np-api-desc :global(p) { margin: 0 0 14px; }
  .np-api-desc :global(p:last-child) { margin-bottom: 0; }
  .np-api-servers-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 8px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    overflow: hidden;
    font-size: 14px;
  }
  .np-api-servers-table thead {
    background-color: var(--np-table-header-bg);
  }
  .np-api-servers-table tbody tr:nth-child(even) {
    background-color: var(--np-table-row-alt);
  }
  .np-api-servers-table tbody tr:hover {
    background-color: var(--np-table-row-hover);
  }
  .np-api-servers-table th {
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    color: var(--np-text-secondary);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid var(--np-border);
  }
  .np-api-servers-table td {
    padding: 10px 14px;
    color: var(--np-text-primary);
    border-bottom: 1px solid var(--np-divider);
    vertical-align: top;
  }
  .np-api-servers-table tbody tr:last-child td { border-bottom: 0; }
  .np-api-servers-table td code {
    font-family: var(--np-font-mono);
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
    padding: 2px 8px;
    border-radius: var(--np-radius-sm);
    font-size: 13px;
  }

  .np-tag-card,
  .np-schemas-card {
    margin-bottom: 24px;
    background-color: var(--np-bg);
    border-radius: var(--np-radius-lg);
  }
  .np-tag-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 16px 4px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--np-divider);
    scroll-margin-top: calc(var(--np-header-height) + 16px);
  }
  .np-schemas-toggle,
  .np-tag-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--np-divider);
    padding: 16px 4px;
    margin: 0 0 8px;
    cursor: pointer;
    color: var(--np-text-primary);
    text-align: left;
    font: inherit;
  }
  .np-tag-card.collapsed .np-tag-toggle { margin-bottom: 0; }
  .np-schemas-toggle:focus,
  .np-tag-toggle:focus { outline: none; }
  .np-schemas-toggle:focus-visible,
  .np-tag-toggle:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 2px;
    border-radius: var(--np-radius-sm);
  }
  .np-schemas-toggle h2,
  .np-tag-toggle h2 { flex: 0 0 auto; }
  .np-schemas-toggle .np-tag-count,
  .np-tag-toggle .np-tag-count { margin-left: auto; }
  .np-schemas-chev,
  .np-tag-chev {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: var(--np-text-muted);
    transition: transform 0.15s ease, color 0.15s ease;
  }
  .np-schemas-chev.open,
  .np-tag-chev.open {
    transform: rotate(90deg);
  }
  .np-schemas-toggle:hover .np-schemas-chev,
  .np-tag-toggle:hover .np-tag-chev {
    color: var(--np-text-primary);
  }

  .np-page-footer {
    margin-top: 64px;
    padding: 32px 0 0;
    border-top: 0;
    text-align: center;
    color: var(--np-text-faint);
    font-size: 13px;
    white-space: pre-line;
  }
  h2 {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .np-tag-count {
    font-size: 11px;
    color: var(--np-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
  }
  .np-tag-ops {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .np-tag-card.collapsed .np-tag-ops {
    display: none;
  }

  .np-schemas-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .np-schema-block {
    padding: 16px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-card);
    scroll-margin-top: calc(var(--np-header-height) + 16px);
  }
  .np-schema-block h3 {
    font-family: var(--np-font-mono);
    font-size: 14px;
    margin: 0 0 10px;
    color: var(--np-text-primary);
    font-weight: 600;
  }

  :global(.np-flash) {
    background-color: var(--np-brand-soft) !important;
    transition: background-color 1.2s ease;
  }

  .np-op-lazy {
    margin-bottom: 16px;
    padding: 20px 24px;
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    scroll-margin-top: calc(var(--np-header-height) + 16px);
    min-height: 96px;
  }
  .np-op-lazy-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .np-op-lazy-method {
    font-family: var(--np-font-mono);
    font-weight: 700;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: var(--np-radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #fff;
    background-color: var(--np-text-muted);
  }
  .np-op-lazy-method-get { background-color: #2f6f3e; }
  .np-op-lazy-method-post { background-color: #14587a; }
  .np-op-lazy-method-put { background-color: #856120; }
  .np-op-lazy-method-patch { background-color: #6d4393; }
  .np-op-lazy-method-delete { background-color: #8a2c2c; }
  .np-op-lazy-path {
    font-family: var(--np-font-mono);
    font-size: 14px;
    color: var(--np-text-primary);
    word-break: break-all;
  }
  .np-op-lazy-summary {
    color: var(--np-text-secondary);
    font-size: 14px;
    margin-top: 8px;
  }
</style>
