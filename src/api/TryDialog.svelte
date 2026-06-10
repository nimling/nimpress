<script lang="ts">
  import { onMount } from 'svelte'
  import TryPanel from './TryPanel.svelte'
  import CodeExamples from './CodeExamples.svelte'
  import MethodBadge from './MethodBadge.svelte'
  import CodeEditor from '../markdown/CodeEditor.svelte'
  import { createTryState, type TryState } from './tryState'
  import type { FlatOperation, FlatServer, SecurityScheme } from './types'

  let {
    operations,
    securitySchemes = {},
    servers = [],
    specVersion = ''
  }: {
    operations: FlatOperation[]
    securitySchemes?: Record<string, SecurityScheme>
    servers?: FlatServer[]
    specVersion?: string
  } = $props()

  const CACHE_VERSION = 'v1'
  const cacheKey = $derived(`nimpress-try-cache-${CACHE_VERSION}-${specVersion || 'unknown'}`)

  let open = $state(false)
  let selectedOpId = $state<string>('')
  let tryStates = $state<Record<string, TryState>>({})
  let suppressUrlUpdate = false

  const selectedOp = $derived(operations.find((o) => o.id === selectedOpId) ?? null)
  const initialServer = $derived(
    servers.find((s) => typeof s?.url === 'string' && s.url.includes('.dev.'))?.url ?? servers[0]?.url ?? ''
  )

  function loadCache(): Record<string, TryState> | null {
    if (typeof localStorage === 'undefined') return null
    try {
      const raw = localStorage.getItem(cacheKey)
      if (!raw) return null
      const obj = JSON.parse(raw)
      if (!obj || typeof obj !== 'object') return null
      return obj as Record<string, TryState>
    } catch {
      clearCache()
      return null
    }
  }

  function clearCache() {
    if (typeof localStorage === 'undefined') return
    try {
      const keep = new Set([cacheKey])
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (k && k.startsWith(`nimpress-try-cache-`) && !keep.has(k)) {
          localStorage.removeItem(k)
        }
      }
      localStorage.removeItem(cacheKey)
    } catch {}
  }

  function saveCache(states: Record<string, TryState>) {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(cacheKey, JSON.stringify(states))
    } catch {
      clearCache()
    }
  }

  function ensureState(opId: string): TryState {
    if (tryStates[opId]) return tryStates[opId]
    const op = operations.find((o) => o.id === opId)
    if (!op) {
      return createTryState(operations[0], initialServer, securitySchemes)
    }
    const cached = loadCache()?.[opId]
    const fresh = createTryState(op, initialServer, securitySchemes)
    const merged = cached ? { ...fresh, ...cached } : fresh
    tryStates = { ...tryStates, [opId]: merged }
    return merged
  }

  function encodeState(state: TryState): string {
    try {
      const json = JSON.stringify(state)
      return btoa(unescape(encodeURIComponent(json)))
    } catch {
      return ''
    }
  }

  function decodeState(b64: string): TryState | null {
    try {
      const json = decodeURIComponent(escape(atob(b64)))
      const obj = JSON.parse(json)
      if (!obj || typeof obj !== 'object') return null
      return obj as TryState
    } catch {
      clearCache()
      return null
    }
  }

  function updateUrl(opId: string, state: TryState | null) {
    if (suppressUrlUpdate || typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (opId) {
      url.searchParams.set('try', opId)
      if (state) {
        const enc = encodeState(state)
        if (enc) url.searchParams.set('state', enc)
        else url.searchParams.delete('state')
      } else {
        url.searchParams.delete('state')
      }
    } else {
      url.searchParams.delete('try')
      url.searchParams.delete('state')
    }
    window.history.replaceState({}, '', url.toString())
  }

  function openFor(opId: string, state?: TryState) {
    const exists = operations.some((o) => o.id === opId)
    if (!exists) return
    selectedOpId = opId
    if (state) tryStates = { ...tryStates, [opId]: state }
    else ensureState(opId)
    open = true
  }

  function close() {
    open = false
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('try')
      url.searchParams.delete('state')
      window.history.replaceState({}, '', url.toString())
    }
  }

  function onPickOp(ev: Event) {
    const target = ev.currentTarget as HTMLSelectElement
    selectedOpId = target.value
    ensureState(selectedOpId)
    updateUrl(selectedOpId, tryStates[selectedOpId] ?? null)
  }

  let shareLabel = $state('Share')
  async function share() {
    if (typeof window === 'undefined' || !selectedOpId) return
    const s = tryStates[selectedOpId]
    if (s) {
      suppressUrlUpdate = true
      updateUrl(selectedOpId, s)
      suppressUrlUpdate = false
    }
    const link = window.location.href
    try {
      await navigator.clipboard.writeText(link)
      shareLabel = 'Copied'
    } catch {
      shareLabel = 'Copy failed'
    }
    setTimeout(() => (shareLabel = 'Share'), 1600)
  }

  function clearCurrent() {
    if (!selectedOp) return
    const fresh = createTryState(selectedOp, initialServer, securitySchemes)
    const next = { ...tryStates }
    delete next[selectedOpId]
    tryStates = { ...next, [selectedOpId]: fresh }
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = loadCache() ?? {}
        delete cached[selectedOpId]
        if (Object.keys(cached).length === 0) localStorage.removeItem(cacheKey)
        else localStorage.setItem(cacheKey, JSON.stringify(cached))
      } catch {}
    }
    suppressUrlUpdate = true
    updateUrl(selectedOpId, null)
    suppressUrlUpdate = false
  }

  function onBackdrop(ev: MouseEvent) {
    if (ev.target === ev.currentTarget) close()
  }

  function onKey(ev: KeyboardEvent) {
    if (!open) return
    if (ev.key === 'Escape') close()
    if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
      ev.preventDefault()
      if (typeof window !== 'undefined' && selectedOpId) {
        window.dispatchEvent(new CustomEvent('nimpress:try-send', { detail: { opId: selectedOpId } }))
      }
    }
  }

  $effect(() => {
    if (!open || !selectedOpId) return
    const s = tryStates[selectedOpId]
    if (!s) return
    saveCache(tryStates)
    updateUrl(selectedOpId, s)
  })

  function syncFromUrl() {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const opId = params.get('try')
    if (!opId) {
      if (open) open = false
      return
    }
    const exists = operations.some((o) => o.id === opId)
    if (!exists) return
    suppressUrlUpdate = true
    const b64 = params.get('state')
    if (b64) {
      const restored = decodeState(b64)
      if (restored) openFor(opId, restored)
      else openFor(opId)
    } else {
      openFor(opId)
    }
    suppressUrlUpdate = false
  }

  onMount(() => {
    const onTryOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ opId?: string }>).detail
      if (detail?.opId) openFor(detail.opId)
    }
    const onPop = () => syncFromUrl()
    window.addEventListener('nimpress:try-open', onTryOpen as EventListener)
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    syncFromUrl()
    return () => {
      window.removeEventListener('nimpress:try-open', onTryOpen as EventListener)
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
    }
  })
</script>

{#if open && selectedOp}
  <div class="np-try-backdrop" role="dialog" aria-modal="true" onclick={onBackdrop}>
    <div class="np-try-dialog">
      <header class="np-try-dialog-head">
        <div class="np-try-target">
          <MethodBadge method={selectedOp.method} size="md" />
        </div>
        <div class="np-try-picker">
          <select aria-label="Endpoint" value={selectedOpId} onchange={onPickOp}>
            {#each operations as o (o.id)}
              <option value={o.id}>{o.method} {o.path} — {o.summary}</option>
            {/each}
          </select>
        </div>
        <div class="np-try-dialog-controls">
          <button class="np-try-close" type="button" onclick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      </header>
      <div class="np-try-dialog-grid">
        <div class="np-try-dialog-cell np-try-dialog-cell-inputs">
          {#if tryStates[selectedOpId]}
            <TryPanel
              op={selectedOp}
              {servers}
              {securitySchemes}
              bind:tryState={tryStates[selectedOpId]}
              hideBody={true}
            />
          {/if}
        </div>
        <div class="np-try-dialog-cell np-try-dialog-cell-body">
          {#if tryStates[selectedOpId] && ['POST', 'PUT', 'PATCH'].includes(selectedOp.method)}
            <header class="np-try-section-head"><span>Body</span></header>
            <div class="np-try-body-host">
              <CodeEditor bind:value={tryStates[selectedOpId].bodyValue} language="json" title="body" variant="try" showLineNumbers={false} />
            </div>
          {:else}
            <header class="np-try-section-head"><span>Body</span></header>
            <div class="np-try-body-empty">This endpoint has no request body.</div>
          {/if}
        </div>
        <div class="np-try-dialog-cell np-try-dialog-cell-footer">
          {#if tryStates[selectedOpId]}
            <CodeExamples
              op={selectedOp}
              {securitySchemes}
              bind:tryState={tryStates[selectedOpId]}
            />
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .np-try-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
  }
  .np-try-dialog {
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    width: min(1280px, 100%);
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
  .np-try-dialog-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 16px;
    align-items: center;
    padding: 14px 22px;
    border-bottom: 1px solid var(--np-divider);
    background-color: var(--np-bg-surface);
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .np-try-picker { position: relative; }
  .np-try-picker select {
    width: 100%;
    padding: 10px 44px 10px 18px;
    background-color: var(--np-bg);
    color: var(--np-text-primary);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    font-size: 13px;
    font-family: inherit;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    cursor: pointer;
  }
  .np-try-picker::after {
    content: '';
    position: absolute;
    right: 16px;
    top: 50%;
    width: 10px;
    height: 10px;
    border-right: 2px solid var(--np-text-muted);
    border-bottom: 2px solid var(--np-text-muted);
    transform: translateY(-70%) rotate(45deg);
    pointer-events: none;
  }
  .np-try-target {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .np-try-dialog-controls {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .np-try-meta {
    background-color: transparent;
    color: var(--np-text-secondary);
    border: 1px solid var(--np-border);
    padding: 6px 14px;
    border-radius: var(--np-radius-md);
    font-weight: 600;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .np-try-meta:hover {
    background-color: var(--np-bg);
    color: var(--np-text-primary);
    border-color: var(--np-text-muted);
  }
  .np-try-path {
    font-family: var(--np-font-mono);
    font-size: 12.5px;
    color: var(--np-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 320px;
  }
  .np-try-close {
    background: transparent;
    border: 1px solid var(--np-border);
    color: var(--np-text-primary);
    border-radius: var(--np-radius-md);
    padding: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .np-try-close:hover {
    background-color: var(--np-bg-surface);
    border-color: var(--np-text-muted);
  }
  .np-try-dialog-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: minmax(360px, 1fr) auto;
    gap: 0;
    min-height: 0;
  }
  .np-try-dialog-cell {
    min-height: 0;
    background-color: var(--np-bg);
    display: flex;
    flex-direction: column;
  }
  .np-try-dialog-cell-inputs {
    grid-column: 1;
    grid-row: 1;
    border-right: 1px solid var(--np-divider);
    overflow-y: auto;
  }
  .np-try-dialog-cell-body {
    grid-column: 2;
    grid-row: 1;
    min-height: 360px;
    overflow: hidden;
  }
  .np-try-dialog-cell-footer {
    grid-column: 1 / -1;
    grid-row: 2;
    border-top: 1px solid var(--np-divider);
  }
  .np-try-section-head {
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--np-text-secondary);
    background-color: var(--np-bg-surface);
    border-bottom: 1px solid var(--np-divider);
  }
  .np-try-body-host {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
  }
  .np-try-body-host :global(.np-editor) {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    border-radius: 0;
    border: 0;
  }
  .np-try-body-empty {
    padding: 24px 16px;
    color: var(--np-text-muted);
    font-style: italic;
    font-size: 13px;
  }
  .np-try-dialog-cell :global(.np-examples),
  .np-try-dialog-cell :global(.np-try) {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }
  .np-try-dialog-cell > :global(:first-child) {
    border-top: 0;
  }
  .np-try-dialog-cell > :global(:last-child) {
    border-bottom: 0;
  }
  @media (max-width: 900px) {
    .np-try-backdrop { padding: 0; }
    .np-try-dialog {
      width: 100%;
      max-height: 100vh;
      border-radius: 0;
      border: 0;
    }
    .np-try-dialog-head {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .np-try-target { display: none; }
    .np-try-dialog-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .np-try-dialog-cell-try {
      border-right: 0;
      border-bottom: 1px solid var(--np-divider);
    }
  }
</style>
