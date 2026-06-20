<script lang="ts">
  import { onMount, getContext } from 'svelte'
  import MethodBadge from './MethodBadge.svelte'
  import ParamRow from './ParamRow.svelte'
  import Schema from './Schema.svelte'
  import TryPanel from './TryPanel.svelte'
  import CodeExamples from './CodeExamples.svelte'
  import CodeEditor from '../markdown/CodeEditor.svelte'
  import { createTryState } from './tryState'
  import { SCHEMAS_CONTEXT, resolveRef, type SchemaRegistry } from './refs'
  import type { FlatOperation, SecurityScheme, FlatServer } from './types'

  let {
    op,
    serverUrl = '',
    servers = [],
    securitySchemes = {},
    collapsedDefault = false,
    specVersion = '',
    specId = ''
  }: {
    op: FlatOperation
    serverUrl?: string
    servers?: FlatServer[]
    securitySchemes?: Record<string, SecurityScheme>
    collapsedDefault?: boolean
    specVersion?: string
    specId?: string
  } = $props()

  const registryAccess = getContext<() => SchemaRegistry>(SCHEMAS_CONTEXT)
  const getRegistry = () => (registryAccess ? registryAccess() : null)

  const id = $derived(`operation/${op.id}`)
  const reqBody = $derived(op.requestBody as any)
  const reqSchema = $derived(reqBody?.content?.['application/json']?.schema)
  const responses = $derived(op.responses as Record<string, any> | undefined)

  let expanded = $state(!collapsedDefault)

  const initialServer = (() => {
    const list = servers ?? []
    const dev = list.find((s) => typeof s?.url === 'string' && s.url.includes('.dev.'))
    return dev?.url ?? list[0]?.url ?? serverUrl
  })()
  const cacheKey = $derived(`nimpress-try-cache-v1-${specId || 'unknown'}-${specVersion || 'unknown'}`)
  function readCached() {
    if (typeof localStorage === 'undefined') return null
    try {
      const raw = localStorage.getItem(cacheKey)
      if (!raw) return null
      const obj = JSON.parse(raw)
      return obj?.[op.id] ?? null
    } catch {
      try { localStorage.removeItem(cacheKey) } catch {}
      return null
    }
  }
  function writeCached(state: import('./tryState').TryState) {
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(cacheKey)
      const obj = raw ? JSON.parse(raw) : {}
      obj[op.id] = state
      localStorage.setItem(cacheKey, JSON.stringify(obj))
    } catch {
      try { localStorage.removeItem(cacheKey) } catch {}
    }
  }
  function clearCached() {
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(cacheKey)
      if (!raw) return
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') {
        delete obj[op.id]
        if (Object.keys(obj).length === 0) localStorage.removeItem(cacheKey)
        else localStorage.setItem(cacheKey, JSON.stringify(obj))
      }
    } catch {
      try { localStorage.removeItem(cacheKey) } catch {}
    }
  }
  const baseState = createTryState(op, initialServer, securitySchemes, getRegistry())
  const cached = readCached()
  let tryState = $state(cached ? { ...baseState, ...cached } : baseState)
  $effect(() => { writeCached(tryState) })
  function handleClear() {
    tryState = createTryState(op, initialServer, securitySchemes, getRegistry())
    clearCached()
  }
  async function handleShare(): Promise<'ok' | 'fail'> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return 'fail'
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('try', op.id)
      const json = JSON.stringify(tryState)
      url.searchParams.set('state', btoa(unescape(encodeURIComponent(json))))
      await navigator.clipboard.writeText(url.toString())
      return 'ok'
    } catch { return 'fail' }
  }

  function openTryDialog() {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('nimpress:try-open', { detail: { opId: op.id } }))
  }

  let respTab = $state<Record<string, string>>({})
  let reqBodyTab = $state<string>('')

  interface RespTab {
    key: string
    label: string
    kind: 'schema' | 'example'
    contentType: string
  }

  function tabsFor(code: string, resp: any): RespTab[] {
    const tabs: RespTab[] = []
    const content = resp?.content ?? {}
    const contentTypes = Object.keys(content)
    if (contentTypes.length === 0 && op.responseExamples?.[code] !== undefined) {
      tabs.push({
        key: 'example:application/json',
        label: 'Example',
        kind: 'example',
        contentType: 'application/json'
      })
      return tabs
    }
    const seenSchema = new Set<string>()
    for (const ct of contentTypes) {
      if (content[ct]?.schema && !seenSchema.has(ct)) {
        seenSchema.add(ct)
        tabs.push({
          key: `schema:${ct}`,
          label: contentTypes.length > 1 ? `Schema (${shortCt(ct)})` : 'Schema',
          kind: 'schema',
          contentType: ct
        })
      }
    }
    for (const ct of contentTypes) {
      const entry = content[ct] ?? {}
      const resolvedSchema = entry.schema ? (resolveRef(entry.schema, getRegistry()) as any) : undefined
      const hasExample =
        entry.example !== undefined ||
        (entry.examples && Object.keys(entry.examples).length) ||
        resolvedSchema?.example !== undefined ||
        (ct === 'application/json' && op.responseExamples?.[code] !== undefined)
      if (hasExample) {
        tabs.push({
          key: `example:${ct}`,
          label: contentTypes.length > 1 ? `Example (${shortCt(ct)})` : 'Example',
          kind: 'example',
          contentType: ct
        })
      }
    }
    return tabs
  }

  function shortCt(ct: string): string {
    if (ct === 'application/json') return 'json'
    if (ct === 'application/xml' || ct === 'text/xml') return 'xml'
    if (ct === 'text/plain') return 'text'
    if (ct === 'text/event-stream') return 'sse'
    if (ct.includes('/')) return ct.split('/')[1]
    return ct
  }

  function defaultTab(tabs: RespTab[]): string {
    const schema = tabs.find((t) => t.kind === 'schema')
    return schema?.key ?? tabs[0]?.key ?? ''
  }

  function selectedTab(code: string, tabs: RespTab[]): string {
    const chosen = respTab[code]
    if (chosen && tabs.some((t) => t.key === chosen)) return chosen
    return defaultTab(tabs)
  }

  function pickExampleObject(examples: Record<string, any> | undefined): any {
    if (!examples) return undefined
    if (examples.default !== undefined) return examples.default
    const first = Object.values(examples)[0]
    return first
  }

  function unwrapExampleValue(raw: any): any {
    if (raw !== null && typeof raw === 'object' && 'value' in raw) {
      return (raw as { value?: unknown }).value
    }
    return raw
  }

  function exampleValue(code: string, resp: any, ct: string): string {
    const entry = resp?.content?.[ct] ?? {}
    const resolvedSchema = entry.schema ? (resolveRef(entry.schema, getRegistry()) as any) : undefined
    const raw =
      entry.example ??
      pickExampleObject(entry.examples) ??
      resolvedSchema?.example ??
      (ct === 'application/json' ? op.responseExamples?.[code] : undefined)
    if (raw === undefined) return ''
    const value = unwrapExampleValue(raw)
    if (value === undefined) return ''
    if (ct === 'application/json') {
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return String(value)
      }
    }
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  function exampleLang(ct: string): 'json' | 'plain' {
    if (ct === 'application/json') return 'json'
    return 'plain'
  }

  let mountInline = $state(false)

  onMount(() => {
    const onToggleAll = (e: Event) => {
      const detail = (e as CustomEvent<{ collapsed?: boolean }>).detail
      expanded = !(detail?.collapsed ?? true)
    }
    window.addEventListener('np-api-toggle-all', onToggleAll)
    const ric =
      typeof (window as any).requestIdleCallback === 'function'
        ? (window as any).requestIdleCallback
        : null
    let handle: number | null = null
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    if (ric) {
      handle = ric(() => { mountInline = true }, { timeout: 600 })
    } else {
      timeoutHandle = setTimeout(() => { mountInline = true }, 80)
    }
    return () => {
      window.removeEventListener('np-api-toggle-all', onToggleAll)
      if (handle !== null) {
        const cic = (window as any).cancelIdleCallback
        if (typeof cic === 'function') cic(handle)
      }
      if (timeoutHandle !== null) clearTimeout(timeoutHandle)
    }
  })
</script>

<section id={id} class="np-op-shell" class:np-op-collapsed={!expanded}>
  <div class="np-op-card">
  <div class="np-op-top">
      <header class="np-op-head">
        <div class="np-op-head-body">
          <div class="np-op-title-row">
            <MethodBadge method={op.method} size="lg" />
            <code class="np-op-path">{op.path}</code>
          </div>
          <h3 class="np-op-summary">{op.summary}</h3>
          {#if op.description_html || op.description}
            <div class="np-op-desc-wrap">
              {#if op.description_html}
                <div class="np-op-desc">{@html op.description_html}</div>
              {:else}
                <p class="np-op-desc">{op.description}</p>
              {/if}
            </div>
          {/if}
        </div>
        <button
          class="np-op-toggle"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          aria-expanded={expanded}
          onclick={() => (expanded = !expanded)}
        >
          <svg class="np-op-toggle-chev" class:open={expanded} viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </header>

      <button
        class="np-op-try-side"
        type="button"
        onclick={openTryDialog}
        title="Open the Try out dialog for this endpoint"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 2 L 14 8 L 4 14 Z" fill="currentColor" />
        </svg>
        <span>Try out</span>
      </button>
  </div>

  <div class="np-op-body">
      {#if expanded && op.parameters.length}
        {@const paramGroups = [
          { key: 'path', label: 'Path parameters', items: op.parameters.filter((p) => p.in === 'path') },
          { key: 'query', label: 'Query parameters', items: op.parameters.filter((p) => p.in === 'query') },
          { key: 'header', label: 'Headers', items: op.parameters.filter((p) => p.in === 'header') },
          { key: 'cookie', label: 'Cookies', items: op.parameters.filter((p) => p.in === 'cookie') }
        ]}
        {#each paramGroups as group (group.key)}
          {#if group.items.length}
            <div class="np-section">
              <div class="np-section-head">{group.label}</div>
              <div class="np-section-body np-section-body-flush">
                {#each group.items as p, pi (`${p.name ?? ''}-${p.in ?? ''}-${pi}`)}
                  <ParamRow param={p} />
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {/if}

      {#if expanded && reqBody?.content}
        {@const reqTabs = (() => {
          const out: { key: string; label: string; kind: 'schema' | 'example'; contentType: string; example?: string }[] = []
          const cts = Object.keys(reqBody.content)
          for (const ct of cts) {
            const entry = reqBody.content[ct] ?? {}
            if (entry.schema) {
              out.push({
                key: `schema:${ct}`,
                label: cts.length > 1 ? `Schema (${shortCt(ct)})` : 'Schema',
                kind: 'schema',
                contentType: ct
              })
            }
          }
          for (const ct of cts) {
            const entry = reqBody.content[ct] ?? {}
            const resolvedSchema = entry.schema ? (resolveRef(entry.schema, getRegistry()) as any) : undefined
            const ex =
              entry.example ??
              pickExampleObject(entry.examples) ??
              resolvedSchema?.example ??
              (ct === 'application/json' ? op.requestExample : undefined)
            if (ex !== undefined) {
              const unwrapped = unwrapExampleValue(ex)
              if (unwrapped === undefined) continue
              const value = ct === 'application/json'
                ? (() => { try { return JSON.stringify(unwrapped, null, 2) } catch { return String(unwrapped) } })()
                : (typeof unwrapped === 'string' ? unwrapped : (() => { try { return JSON.stringify(unwrapped, null, 2) } catch { return String(unwrapped) } })())
              out.push({
                key: `example:${ct}`,
                label: cts.length > 1 ? `Example (${shortCt(ct)})` : 'Example',
                kind: 'example',
                contentType: ct,
                example: value
              })
            }
          }
          return out
        })()}
        {#if reqTabs.length > 0}
          <div class="np-section np-section-responses">
            <div class="np-section-head">Request body</div>
            <div class="np-section-body np-section-body-responses">
              <div class="np-resp">
                {#if reqTabs.length > 1 || true}
                  {@const reqSel = reqBodyTab && reqTabs.some((t) => t.key === reqBodyTab) ? reqBodyTab : (reqTabs.find((t) => t.kind === 'schema')?.key ?? reqTabs[0].key)}
                  <div class="np-resp-tabs">
                    {#each reqTabs as t (t.key)}
                      <button class:active={reqSel === t.key} onclick={() => (reqBodyTab = t.key)}>{t.label}</button>
                    {/each}
                  </div>
                  <div class={`np-resp-view np-resp-view-${(reqTabs.find((t) => t.key === reqSel) ?? reqTabs[0]).kind}`}>
                    {#each reqTabs as t (t.key)}
                      {#if reqSel === t.key}
                        {#if t.kind === 'schema'}
                          <Schema schema={reqBody.content[t.contentType].schema} />
                        {:else}
                          <CodeEditor
                            value={t.example ?? ''}
                            language={exampleLang(t.contentType)}
                            readonly
                            fitContent={true}
                            title={t.contentType}
                            showLineNumbers={false}
                          />
                        {/if}
                      {/if}
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      {/if}

      {#if expanded && responses && Object.keys(responses).length}
        <div class="np-section np-section-responses">
          <div class="np-section-head">Responses</div>
          <div class="np-section-body np-section-body-responses">
            {#each Object.entries(responses) as [code, resp], ri (code || `resp-${ri}`)}
              {@const tabs = tabsFor(code, resp)}
              {@const sel = selectedTab(code, tabs)}
              {@const respContentTypes = Object.keys((resp as any)?.content ?? {})}
              <div class="np-resp">
                <div class="np-resp-row">
                  <span class="np-resp-code" data-ok={Number(code) < 400}>{code}</span>
                  {#if (resp as any).description}
                    <div class="np-resp-desc">{(resp as any).description}</div>
                  {/if}
                  {#each respContentTypes as ct (ct)}
                    <span class="np-resp-ct">{ct}</span>
                  {/each}
                </div>
                {#if tabs.length > 0}
                  <div class="np-resp-tabs">
                    {#each tabs as t (t.key)}
                      <button
                        class:active={sel === t.key}
                        onclick={() => (respTab = { ...respTab, [code]: t.key })}
                      >
                        {t.label}
                      </button>
                    {/each}
                  </div>
                  <div class={`np-resp-view np-resp-view-${(tabs.find((t) => t.key === sel) ?? tabs[0]).kind}`}>
                    {#each tabs as t (t.key)}
                      {#if sel === t.key}
                        {#if t.kind === 'schema'}
                          <Schema schema={(resp as any).content[t.contentType].schema} />
                        {:else}
                          <CodeEditor
                            value={exampleValue(code, resp, t.contentType)}
                            language={exampleLang(t.contentType)}
                            readonly
                            fitContent={true}
                            title={t.contentType}
                            showLineNumbers={false}
                          />
                        {/if}
                      {/if}
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
  </div>
  </div>

  <aside class="np-op-inline">
    <div class="np-op-inline-sticky">
      <div class="np-op-inline-card">
        {#if mountInline}
          <TryPanel
            {op}
            {servers}
            {securitySchemes}
            bind:tryState
            disabled={!expanded}
            onOpenDialog={openTryDialog}
            onClear={() => handleClear()}
            onShare={() => handleShare()}
          />
          {#if expanded}
            <CodeExamples {op} {securitySchemes} bind:tryState />
          {/if}
        {:else}
          <div class="np-op-inline-skeleton" aria-hidden="true"></div>
        {/if}
      </div>
    </div>
  </aside>
</section>

<style>
  .np-op-shell {
    scroll-margin-top: calc(var(--np-header-height) + 16px);
    margin-bottom: 32px;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .np-op-card {
    min-width: 0;
  }
  .np-op-inline {
    display: none;
  }
  .np-op-inline-sticky {
    position: sticky;
    top: calc(var(--np-header-height) + 16px);
    display: flex;
    flex-direction: column;
    align-self: flex-start;
  }
  .np-op-inline-card {
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .np-op-inline-card :global(.np-examples),
  .np-op-inline-card :global(.np-try) {
    margin: 0;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
  }
  .np-op-inline-card > :global(:first-child) { border-top: 0; }
  .np-op-inline-card > :global(:not(:last-child)) { border-bottom: 1px solid var(--np-divider); }
  .np-op-inline-skeleton {
    min-height: 220px;
    background:
      linear-gradient(
        110deg,
        rgba(255, 255, 255, 0.02) 8%,
        rgba(255, 255, 255, 0.05) 18%,
        rgba(255, 255, 255, 0.02) 33%
      );
    background-size: 200% 100%;
    animation: np-op-shimmer 1.6s linear infinite;
  }
  @keyframes np-op-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .np-op-head {
    padding: 20px 24px;
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    display: flex;
    align-items: stretch;
    gap: 16px;
    transition: padding 0.3s ease;
  }
  .np-op-head-body {
    flex: 1;
    min-width: 0;
  }
  .np-op-try-side {
    flex: 0 0 auto;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 12px;
    margin-left: 12px;
    border: 1px solid color-mix(in srgb, var(--np-brand) 50%, transparent);
    background-color: color-mix(in srgb, var(--np-brand) 10%, transparent);
    color: var(--np-brand);
    border-radius: var(--np-radius-lg);
    cursor: pointer;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    transition: background-color 0.15s ease, border-color 0.15s ease;
    min-width: 0;
  }
  .np-op-try-side:hover {
    background-color: color-mix(in srgb, var(--np-brand) 20%, transparent);
    border-color: var(--np-brand);
  }
  .np-op-try-side svg {
    writing-mode: horizontal-tb;
    display: block;
  }
  .np-op-toggle {
    flex: 0 0 auto;
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    background: transparent;
    border: 0;
    color: var(--np-text-muted);
    cursor: pointer;
    border-radius: 0;
    margin: -8px 0;
    padding: 0 8px;
    box-shadow: none;
  }
  .np-op-toggle:hover {
    background: transparent;
    color: var(--np-brand);
  }
  .np-op-toggle:focus,
  .np-op-toggle:focus-visible {
    outline: none;
    background: transparent;
  }
  .np-op-toggle-chev {
    transition: transform 0.2s ease;
  }
  .np-op-toggle-chev.open {
    transform: rotate(90deg);
  }
  .np-op-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    transition: margin-bottom 0.3s ease;
  }
  .np-op-path {
    font-family: var(--np-font-mono);
    font-size: 15px;
    color: var(--np-text-primary);
    background: transparent;
    border: 0;
    padding: 0;
    word-break: break-all;
  }
  .np-op-summary {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--np-text-primary);
    transition: font-size 0.3s ease;
  }
  .np-op-desc-wrap {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows 0.3s ease;
  }
  .np-op-desc {
    color: var(--np-text-secondary);
    margin: 0;
    padding-top: 6px;
    font-size: 14px;
    line-height: 1.6;
    overflow: hidden;
    min-height: 0;
    opacity: 1;
    transition: opacity 0.25s ease;
  }
  .np-op-collapsed .np-op-desc-wrap {
    grid-template-rows: 0fr;
  }
  .np-op-collapsed .np-op-desc {
    opacity: 0;
  }
  .np-op-collapsed .np-op-head {
    padding: 6px 20px;
    align-items: center;
  }
  .np-op-collapsed .np-op-title-row {
    margin-bottom: 2px;
  }
  .np-op-collapsed .np-op-summary {
    font-size: 14px;
    line-height: 1.3;
  }
  .np-op-collapsed :global(.np-method-lg) {
    padding: 3px 8px;
    font-size: 11px;
  }
  .np-op-collapsed .np-op-path {
    font-size: 13px;
  }
  .np-op-desc :global(p) { margin: 0 0 8px; }
  .np-op-desc :global(p:last-child) { margin-bottom: 0; }
  .np-op-desc :global(a) { color: var(--np-link); text-decoration: underline; text-underline-offset: 2px; }
  .np-op-desc :global(code) {
    font-family: var(--np-font-mono);
    background-color: var(--np-bg-code-inline);
    padding: 1px 5px;
    border-radius: var(--np-radius-sm);
    border: 1px solid var(--np-border);
    font-size: 12.5px;
  }
  .np-op-top {
    display: flex;
    align-items: stretch;
    gap: 0;
  }
  .np-op-top > .np-op-head {
    flex: 1 1 auto;
    min-width: 0;
  }
  .np-op-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    margin-top: 16px;
  }
  .np-op-body:empty {
    display: none;
  }

  .np-section {
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    overflow: hidden;
    background-color: var(--np-bg);
  }
  .np-section-head {
    padding: 8px 16px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--np-text-secondary);
    background-color: var(--np-bg-surface);
    border-bottom: 1px solid var(--np-border);
  }
  .np-section-body { padding: 16px; }
  .np-section-body-flush { padding: 0; }
  .np-section-body-responses { padding: 16px 0; }
  .np-section-body-responses .np-resp { width: 100%; }
  .np-section-body-responses .np-resp-row { padding: 0 16px; }
  .np-section-body-responses .np-resp-tabs { margin: 12px 0 0; padding: 0 16px; }
  .np-section-body-responses .np-resp-view { padding: 0; }
  .np-section-body-responses .np-resp-view-schema { padding: 12px 16px; }
  .np-section-body-responses .np-resp-view-example { padding: 0; }

  .np-responses { width: 100%; }
  .np-responses-head {
    border: 0;
    padding: 8px 0;
    background: transparent;
    border-bottom: 1px solid var(--np-border);
  }
  .np-responses-list { padding: 0; }
  .np-resp {
    margin-top: 28px;
    padding-bottom: 0;
  }
  .np-resp:first-child { margin-top: 16px; }
  .np-resp:last-child { margin-bottom: 0; }
  .np-resp-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;
  }
  .np-resp-code {
    font-family: var(--np-font-mono);
    font-weight: 700;
    padding: 2px 10px;
    border-radius: var(--np-radius-pill);
    background-color: color-mix(in srgb, var(--np-danger) 16%, transparent);
    color: var(--np-danger);
    font-size: 12px;
  }
  .np-resp-code[data-ok='true'] {
    background-color: color-mix(in srgb, var(--np-check) 16%, transparent);
    color: var(--np-check);
  }
  .np-resp-desc { color: var(--np-text-secondary); font-size: 13px; flex: 1 1 auto; min-width: 0; }
  .np-resp-ct {
    margin-left: auto;
    font-family: var(--np-font-mono);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: var(--np-radius-sm);
    background-color: var(--np-bg-surface);
    color: var(--np-text-secondary);
    border: 1px solid var(--np-border);
    white-space: nowrap;
  }
  .np-resp-ct + .np-resp-ct { margin-left: 6px; }
  .np-resp-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 0;
    margin: 12px 0 0;
    border-bottom: 1px solid var(--np-divider);
  }
  .np-resp-tabs button {
    background: transparent;
    border: 0;
    color: var(--np-text-muted);
    font-size: 12.5px;
    padding: 8px 12px;
    border-radius: 0;
    cursor: pointer;
    font-family: var(--np-font-mono);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }
  .np-resp-tabs button:hover { color: var(--np-text-primary); }
  .np-resp-tabs button.active {
    color: var(--np-brand);
    border-bottom-color: var(--np-brand);
  }
  .np-resp-view {
    padding: 0;
    background-color: transparent;
    width: 100%;
  }
  .np-resp-view-schema {
    padding: 12px 16px;
  }
  .np-resp-view-example {
    padding: 0;
  }
  .np-resp-view-example :global(.np-editor) {
    background-color: #0B0B0D;
    border: 0;
    border-radius: 0;
  }
  .np-resp-view-example :global(.np-editor-host),
  .np-resp-view-example :global(.cm-scroller),
  .np-resp-view-example :global(.cm-content) {
    background-color: #0B0B0D;
  }
  .np-resp-view :global(.np-editor) {
    border: 0;
    border-radius: 0;
    background-color: var(--np-bg-code-block);
  }
  .np-resp-view > :global(*) { width: 100%; }

  @media (max-width: 720px) {
    .np-op-top {
      flex-direction: column;
    }
    .np-op-try-side {
      writing-mode: horizontal-tb;
      flex-direction: row;
      padding: 10px 16px;
      margin-left: 0;
      margin-top: 12px;
      align-self: stretch;
    }
  }

  @media (min-width: 1600px) {
    .np-op-shell {
      grid-template-columns: minmax(0, 1fr) 380px;
    }
    .np-op-inline {
      display: block;
      min-width: 0;
      align-self: stretch;
    }
    .np-op-try-side {
      display: none;
    }
    .np-op-collapsed .np-op-card,
    .np-op-collapsed .np-op-top,
    .np-op-collapsed .np-op-head,
    .np-op-collapsed .np-op-inline-sticky,
    .np-op-collapsed .np-op-inline-card {
      height: 100%;
    }
  }
</style>
