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
    specVersion = '',
    specId = ''
  }: {
    operations: FlatOperation[]
    securitySchemes?: Record<string, SecurityScheme>
    servers?: FlatServer[]
    specVersion?: string
    specId?: string
  } = $props()

  const CACHE_VERSION = 'v1'
  const cacheKey = $derived(`nimpress-try-cache-${CACHE_VERSION}-${specId || 'unknown'}-${specVersion || 'unknown'}`)

  let open = $state(false)
  let selectedOpId = $state<string>('')
  let tryStates = $state<Record<string, TryState>>({})
  let suppressUrlUpdate = false
  let dropdownOpen = $state(false)
  let dropdownEl: HTMLDivElement | null = null
  let rightTab = $state<'body' | 'response'>('body')
  let response = $state<{ status: number | null; body: string; error: string | null; sending: boolean }>({
    status: null,
    body: '',
    error: null,
    sending: false
  })
  const selectedOp = $derived(operations.find((o) => o.id === selectedOpId) ?? null)
  const initialServer = $derived(
    servers.find((s) => typeof s?.url === 'string' && s.url.includes('.dev.'))?.url ?? servers[0]?.url ?? ''
  )
  const methodHasBody = $derived(selectedOp ? ['POST', 'PUT', 'PATCH'].includes(selectedOp.method) : false)
  $effect(() => {
    if (!methodHasBody) rightTab = 'response'
  })
  $effect(() => {
    if (response.status !== null || response.error) rightTab = 'response'
  })

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

  const specPrefix = $derived(`nimpress-try-cache-${CACHE_VERSION}-${specId || 'unknown'}-`)

  function clearCache() {
    if (typeof localStorage === 'undefined') return
    try {
      const keep = new Set([cacheKey])
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (k && k.startsWith(specPrefix) && !keep.has(k)) {
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
    dropdownOpen = false
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('try')
      url.searchParams.delete('state')
      window.history.replaceState({}, '', url.toString())
    }
  }

  function pickOp(opId: string) {
    selectedOpId = opId
    ensureState(opId)
    dropdownOpen = false
    updateUrl(opId, tryStates[opId] ?? null)
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

  function send() {
    if (!selectedOpId || typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('nimpress:try-send', { detail: { opId: selectedOpId } }))
  }

  function onBackdrop(ev: MouseEvent) {
    if (ev.target === ev.currentTarget) close()
  }

  function onDocClick(ev: MouseEvent) {
    if (!dropdownOpen || !dropdownEl) return
    if (!dropdownEl.contains(ev.target as Node)) dropdownOpen = false
  }

  function onKey(ev: KeyboardEvent) {
    if (!open) return
    if (ev.key === 'Escape') {
      if (dropdownOpen) { dropdownOpen = false; return }
      close()
    }
    if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
      ev.preventDefault()
      send()
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

  function portal(node: HTMLElement) {
    if (typeof document === 'undefined') return
    document.body.appendChild(node)
    return {
      destroy() {
        if (node.parentNode === document.body) document.body.removeChild(node)
      }
    }
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
    window.addEventListener('mousedown', onDocClick)
    syncFromUrl()
    return () => {
      window.removeEventListener('nimpress:try-open', onTryOpen as EventListener)
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDocClick)
    }
  })
</script>

{#if open && selectedOp}
  <div use:portal class="np-try-backdrop" role="dialog" aria-modal="true" onclick={onBackdrop}>
    <div class="np-try-dialog">
      <header class="np-try-dialog-head np-try-dialog-head-actions">
        <span class="np-try-dialog-title">Try it</span>
        <div class="np-try-dialog-actions">
          <button class="np-try-meta" type="button" onclick={share}>{shareLabel}</button>
          <button class="np-try-meta" type="button" onclick={clearCurrent}>Clear</button>
          <button class="np-try-close" type="button" onclick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      </header>
      <div class="np-try-dialog-picker-row">
        <div class="np-try-picker" bind:this={dropdownEl}>
          <button
            class="np-try-picker-trigger"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            onclick={() => (dropdownOpen = !dropdownOpen)}
          >
            <MethodBadge method={selectedOp.method} size="md" />
            <span class="np-try-picker-path">{selectedOp.path}</span>
            <span class="np-try-picker-summary">{selectedOp.summary}</span>
            <span class="np-try-picker-chev" class:open={dropdownOpen} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          {#if dropdownOpen}
            <ul class="np-try-picker-list" role="listbox">
              {#each operations as o (o.id)}
                <li>
                  <button
                    class="np-try-picker-option"
                    class:selected={o.id === selectedOpId}
                    type="button"
                    role="option"
                    aria-selected={o.id === selectedOpId}
                    onclick={() => pickOp(o.id)}
                  >
                    <MethodBadge method={o.method} size="sm" />
                    <span class="np-try-picker-opt-path">{o.path}</span>
                    <span class="np-try-picker-opt-summary">{o.summary}</span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
        <button class={`np-try-send np-try-send-${selectedOp.method.toLowerCase()}`} type="button" onclick={send} title="Send via Cmd or Ctrl plus Enter">
          <span class="np-try-send-label">{selectedOp.method.toUpperCase()}</span>
          <span class="np-try-send-shortcut" aria-hidden="true">⌘⏎</span>
        </button>
      </div>
      <div class="np-try-dialog-grid">
        <div class="np-try-dialog-cell np-try-dialog-cell-inputs">
          {#if tryStates[selectedOpId]}
            <TryPanel
              op={selectedOp}
              {servers}
              {securitySchemes}
              bind:tryState={tryStates[selectedOpId]}
              bind:response
              hideBody={true}
              hideHeader={true}
              hideResponse={true}
            />
          {/if}
        </div>
        <div class="np-try-dialog-cell np-try-dialog-cell-body">
          {#if methodHasBody}
            <div class="np-try-tabs-bar">
              <button
                type="button"
                class:active={rightTab === 'body'}
                onclick={() => (rightTab = 'body')}
              >body</button>
              <button
                type="button"
                class:active={rightTab === 'response'}
                onclick={() => (rightTab = 'response')}
              >response{#if response.status !== null}<span class="np-try-tab-status" data-ok={response.status < 400}>{response.status}</span>{/if}</button>
            </div>
          {/if}
          <div class="np-try-tab-panel">
            {#if methodHasBody && rightTab === 'body'}
              {#if tryStates[selectedOpId]}
                <div class="np-try-body-host">
                  <CodeEditor bind:value={tryStates[selectedOpId].bodyValue} language="json" title="body" variant="try" showLineNumbers={false} />
                </div>
              {/if}
            {:else}
              {#if response.error}
                <pre class="np-try-response-error">{response.error}</pre>
              {:else if response.status !== null}
                <div class="np-try-response-body">
                  <CodeEditor value={response.body} language="json" title="response" variant="try" showLineNumbers={false} />
                </div>
              {:else}
                <div class="np-try-body-empty">Send the request to see a response.</div>
              {/if}
            {/if}
          </div>
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
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
    overscroll-behavior: contain;
    touch-action: none;
  }
  .np-try-dialog {
    position: relative;
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    width: min(1280px, 100%);
    max-height: calc(100vh - 48px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .np-try-dialog-head {
    position: sticky;
    top: 0;
    z-index: 5;
    background-color: var(--np-bg-surface);
    border-bottom: 1px solid var(--np-divider);
    padding: 14px 22px;
  }
  .np-try-dialog-head-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .np-try-dialog-title {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--np-text-secondary);
  }
  .np-try-dialog-actions {
    display: inline-flex;
    align-items: center;
    gap: 10px;
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
  .np-try-shortcut {
    font-family: var(--np-font-mono);
    font-size: 12px;
    color: var(--np-text-muted);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    padding: 3px 8px;
    background-color: var(--np-bg);
    letter-spacing: 0.04em;
  }
  .np-try-send {
    background-color: var(--np-brand);
    color: var(--np-text-on-brand);
    border: 0;
    padding: 4px 8px;
    border-radius: var(--np-radius-md);
    font-weight: 700;
    cursor: pointer;
    font-size: 13px;
    letter-spacing: 0.05em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    line-height: 1;
  }
  .np-try-send:hover { filter: brightness(1.08); }
  .np-try-send-label {
    display: inline-flex;
    align-items: center;
    padding: 0 4px;
  }
  .np-try-send-shortcut {
    font-family: var(--np-font-mono);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0;
    padding: 2px 4px;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.32);
    color: rgba(255, 255, 255, 0.96);
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .np-try-send-get { background-color: var(--np-method-get, #14a44d); }
  .np-try-send-post { background-color: var(--np-method-post, #2079c7); }
  .np-try-send-put { background-color: var(--np-method-put, #b07309); }
  .np-try-send-patch { background-color: var(--np-method-patch, #8a52ce); }
  .np-try-send-delete { background-color: var(--np-method-delete, #d44a4a); }
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
    background-color: var(--np-bg);
    border-color: var(--np-text-muted);
  }

  .np-try-dialog-picker-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 22px;
    border-bottom: 1px solid var(--np-divider);
    background-color: var(--np-bg-surface);
  }
  .np-try-picker {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
  }
  .np-try-picker-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 44px 10px 14px;
    background-color: var(--np-bg);
    color: var(--np-text-primary);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    text-align: left;
    min-width: 0;
  }
  .np-try-picker-trigger:hover { border-color: var(--np-text-muted); }
  .np-try-picker-path {
    font-family: var(--np-font-mono);
    color: var(--np-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .np-try-picker-summary {
    color: var(--np-text-muted);
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .np-try-picker-chev {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--np-text-muted);
    pointer-events: none;
    transition: transform 0.15s ease;
  }
  .np-try-picker-chev.open {
    transform: translateY(-50%) rotate(180deg);
  }
  .np-try-picker-list {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 6px);
    max-height: 360px;
    overflow-y: auto;
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    list-style: none;
    margin: 0;
    padding: 4px;
    z-index: 10;
  }
  .np-try-picker-option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background-color: transparent;
    border: 0;
    border-radius: var(--np-radius-sm);
    cursor: pointer;
    text-align: left;
    color: var(--np-text-primary);
    font-family: inherit;
    font-size: 12.5px;
    min-width: 0;
  }
  .np-try-picker-option:hover {
    background-color: var(--np-bg-surface);
  }
  .np-try-picker-option.selected {
    background-color: color-mix(in srgb, var(--np-brand) 16%, transparent);
  }
  .np-try-picker-opt-path {
    font-family: var(--np-font-mono);
    white-space: nowrap;
  }
  .np-try-picker-opt-summary {
    color: var(--np-text-muted);
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .np-try-dialog-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 0;
    min-height: 0;
    flex: 1 1 auto;
    overflow: hidden;
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
    overflow-x: auto;
    min-height: 0;
  }
  .np-try-dialog-cell-inputs > :global(.np-try) {
    flex: 0 0 auto;
  }
  .np-try-dialog-cell-body {
    grid-column: 2;
    grid-row: 1;
    overflow: hidden;
    min-height: 0;
  }
  .np-try-tabs-bar {
    display: flex;
    flex-wrap: nowrap;
    gap: 0;
    padding: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background-color: transparent;
    overflow-x: auto;
    scrollbar-width: none;
    flex: 0 0 auto;
  }
  .np-try-tabs-bar::-webkit-scrollbar { display: none; height: 0; }
  .np-try-tabs-bar > button {
    flex: 0 0 auto;
    background: transparent;
    border: 0;
    color: rgba(229, 231, 235, 0.55);
    font-size: 12.5px;
    padding: 10px 12px;
    border-radius: 0;
    cursor: pointer;
    font-family: var(--np-font-mono);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .np-try-tabs-bar > button:hover { color: rgba(229, 231, 235, 0.95); }
  .np-try-tabs-bar > button.active {
    color: var(--np-brand);
    border-bottom-color: var(--np-brand);
    background-color: transparent;
  }
  .np-try-tab-status {
    font-family: var(--np-font-mono);
    font-size: 11px;
    padding: 1px 6px;
    border-radius: var(--np-radius-sm);
    background-color: rgba(0, 0, 0, 0.28);
    color: rgba(229, 231, 235, 0.95);
  }
  .np-try-tab-status[data-ok='true'] { color: var(--np-method-get, #14a44d); }
  .np-try-tab-status[data-ok='false'] { color: var(--np-method-delete, #d44a4a); }
  .np-try-tab-panel {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .np-try-response-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    position: relative;
  }
  .np-try-response-body :global(.np-editor) {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    border-radius: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .np-try-response-body :global(.np-editor-host) {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    display: flex;
  }
  .np-try-response-body :global(.cm-editor) {
    flex: 1 1 auto;
    min-height: 0;
    height: 100% !important;
    width: 100%;
  }
  .np-try-response-body :global(.cm-scroller) {
    max-height: none !important;
    height: 100%;
  }
  .np-try-response-error {
    margin: 0;
    padding: 16px;
    color: var(--np-method-delete, #d44a4a);
    font-family: var(--np-font-mono);
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    overflow: auto;
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
      border-radius: 0;
      border: 0;
    }
    .np-try-dialog-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .np-try-dialog-cell-body {
      grid-column: 1;
      grid-row: 2;
    }
    .np-try-dialog-cell-footer {
      grid-row: 3;
    }
  }
</style>
