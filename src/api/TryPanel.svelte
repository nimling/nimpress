<script lang="ts">
  import CodeEditor from '../markdown/CodeEditor.svelte'
  import type { FlatOperation, SecurityScheme, FlatServer } from './types'
  import { buildUrl, buildHeaders, type TryState } from './tryState'

  let {
    op,
    servers = [],
    securitySchemes = {},
    tryState = $bindable(),
    disabled = false
  }: {
    op: FlatOperation
    servers?: FlatServer[]
    securitySchemes?: Record<string, SecurityScheme>
    tryState: TryState
    disabled?: boolean
  } = $props()

  const schemeNames = $derived(Object.keys(securitySchemes ?? {}))

  let sending = $state(false)
  let responseStatus = $state<number | null>(null)
  let responseBody = $state<string>('')
  let responseError = $state<string | null>(null)

  const STORAGE_KEY = 'nimpress-try-auth'

  function loadAuth() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const obj = JSON.parse(raw) as Record<string, string>
      if (tryState.selectedScheme && obj[tryState.selectedScheme]) {
        tryState.authValue = obj[tryState.selectedScheme]
      }
    } catch {}
  }

  function saveAuth() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const obj = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      if (tryState.selectedScheme) obj[tryState.selectedScheme] = tryState.authValue
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
    } catch {}
  }

  $effect(() => {
    tryState.selectedScheme
    loadAuth()
  })

  $effect(() => {
    tryState.authValue
    if (tryState.selectedScheme) saveAuth()
  })

  const pathParams = $derived(op.parameters.filter((p) => p.in === 'path'))
  const queryParams = $derived(op.parameters.filter((p) => p.in === 'query'))
  const headerParams = $derived(op.parameters.filter((p) => p.in === 'header'))
  const hasBody = $derived(['POST', 'PUT', 'PATCH'].includes(op.method))

  let panelEl = $state<HTMLDivElement | null>(null)
  let pathOpen = $state(true)
  let headersOpen = $state(true)
  let queryOpen = $state(true)
  let bodyOpen = $state(true)
  let userToggled = false

  function measureFit() {
    if (userToggled || !panelEl) return
    const rect = panelEl.getBoundingClientRect()
    const available = Math.max(0, window.innerHeight - rect.top - 80)
    const overflow = panelEl.scrollHeight > available
    const open = !overflow
    pathOpen = open
    headersOpen = open
    queryOpen = open
    bodyOpen = open
  }

  $effect(() => {
    if (disabled || !panelEl) return
    let active = true
    requestAnimationFrame(() => {
      if (!active) return
      requestAnimationFrame(() => {
        if (active) measureFit()
      })
    })
    const onResize = () => measureFit()
    window.addEventListener('resize', onResize)
    return () => {
      active = false
      window.removeEventListener('resize', onResize)
    }
  })

  function toggle(which: 'path' | 'headers' | 'query' | 'body') {
    userToggled = true
    if (which === 'path') pathOpen = !pathOpen
    else if (which === 'headers') headersOpen = !headersOpen
    else if (which === 'query') queryOpen = !queryOpen
    else bodyOpen = !bodyOpen
  }

  async function send() {
    sending = true
    responseStatus = null
    responseBody = ''
    responseError = null
    try {
      const url = buildUrl(op, tryState)
      const init: RequestInit = {
        method: op.method,
        headers: buildHeaders(op, tryState, securitySchemes)
      }
      if (tryState.bodyValue && ['POST', 'PUT', 'PATCH'].includes(op.method)) {
        init.body = tryState.bodyValue
      }
      const res = await fetch(url, init)
      responseStatus = res.status
      const text = await res.text()
      try {
        responseBody = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        responseBody = text
      }
    } catch (err) {
      responseError = String(err)
    } finally {
      sending = false
    }
  }
</script>

<div class="np-try" class:np-try-disabled={disabled} bind:this={panelEl}>
  <header class="np-try-head">
    <span class="np-try-title">Try it</span>
    <button class="np-try-send" onclick={send} disabled={sending || disabled}>
      {sending ? 'Sending…' : 'Send'}
    </button>
  </header>

  {#if disabled}
    <div class="np-try-collapsed-msg">
      Expand endpoint definition to try out
    </div>
  {:else}
  <div class="np-try-body">
    {#if servers.length > 0}
      <label class="np-try-field">
        <span>Server</span>
        <select bind:value={tryState.serverUrl}>
          {#each servers as s, i (s.url || `srv-${i}`)}
            <option value={s.url}>{s.url}</option>
          {/each}
        </select>
      </label>
    {/if}

    {#if schemeNames.length > 0}
      <label class="np-try-field">
        <span>Auth</span>
        <select bind:value={tryState.selectedScheme}>
          <option value="">None</option>
          {#each schemeNames as name (name)}
            <option value={name}>{name} ({securitySchemes[name].type ?? 'auth'})</option>
          {/each}
        </select>
      </label>

      {#if tryState.selectedScheme}
        <label class="np-try-field">
          <span>{securitySchemes[tryState.selectedScheme].scheme === 'bearer' ? 'Token' : 'Value'}</span>
          <input
            type="password"
            bind:value={tryState.authValue}
            placeholder={securitySchemes[tryState.selectedScheme].bearerFormat ?? 'enter value'}
          />
        </label>
      {/if}
    {/if}

    {#if pathParams.length > 0}
      <div class="np-try-group" class:np-try-group-open={pathOpen}>
        <button type="button" class="np-try-group-head" aria-expanded={pathOpen} onclick={() => toggle('path')}>
          <span class="np-try-group-label">Path</span>
          <span class="np-try-group-chev" class:open={pathOpen} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </span>
        </button>
        {#if pathOpen}
          <div class="np-try-group-fields">
            {#each pathParams as p (p.name)}
              <label class="np-try-field">
                <span><code>{p.name}</code>{#if p.required}<em class="np-req">*</em>{/if}</span>
                <input bind:value={tryState.pathValues[p.name]} placeholder={p.example !== undefined ? String(p.example) : ''} />
              </label>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if headerParams.length > 0}
      <div class="np-try-group" class:np-try-group-open={headersOpen}>
        <button type="button" class="np-try-group-head" aria-expanded={headersOpen} onclick={() => toggle('headers')}>
          <span class="np-try-group-label">Headers</span>
          <span class="np-try-group-chev" class:open={headersOpen} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </span>
        </button>
        {#if headersOpen}
          <div class="np-try-group-fields">
            {#each headerParams as p (p.name)}
              <label class="np-try-field">
                <span><code>{p.name}</code>{#if p.required}<em class="np-req">*</em>{/if}</span>
                <input bind:value={tryState.headerValues[p.name]} placeholder={p.example !== undefined ? String(p.example) : ''} />
              </label>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if queryParams.length > 0}
      <div class="np-try-group" class:np-try-group-open={queryOpen}>
        <button type="button" class="np-try-group-head" aria-expanded={queryOpen} onclick={() => toggle('query')}>
          <span class="np-try-group-label">Query</span>
          <span class="np-try-group-chev" class:open={queryOpen} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </span>
        </button>
        {#if queryOpen}
          <div class="np-try-group-fields">
            {#each queryParams as p (p.name)}
              <label class="np-try-field">
                <span><code>{p.name}</code>{#if p.required}<em class="np-req">*</em>{/if}</span>
                <input bind:value={tryState.queryValues[p.name]} placeholder={p.example !== undefined ? String(p.example) : ''} />
              </label>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if hasBody}
      <div class="np-try-group np-try-group-body" class:np-try-group-open={bodyOpen}>
        <button type="button" class="np-try-group-head np-try-group-head-body" aria-expanded={bodyOpen} onclick={() => toggle('body')}>
          <span class="np-try-group-label">Body</span>
          <span class="np-try-group-chev" class:open={bodyOpen} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </span>
        </button>
        {#if bodyOpen}
          <div class="np-try-body-editor">
            <CodeEditor bind:value={tryState.bodyValue} language="json" title="body" variant="try" showLineNumbers={false} />
          </div>
        {/if}
      </div>
    {/if}
  </div>
  {/if}

  {#if !disabled && (responseStatus !== null || responseError)}
    <div class="np-try-result">
      <div class="np-try-result-head">
        <span class="np-try-group-label">Response</span>
        {#if !responseError && responseStatus !== null}
          <span class="np-try-status" data-ok={responseStatus < 400}>
            {responseStatus}
          </span>
        {/if}
      </div>
      {#if responseError}
        <pre class="np-try-error">{responseError}</pre>
      {:else if responseBody}
        <div class="np-try-result-body">
          <CodeEditor value={responseBody} language="json" readonly title="response" variant="try" showLineNumbers={false} />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .np-try {
    background-color: var(--np-bg-card);
    overflow: hidden;
    min-width: 0;
  }
  .np-try-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
  }
  .np-try-title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    color: var(--np-text-secondary);
  }
  .np-try-send {
    background-color: var(--np-brand);
    color: var(--np-text-on-brand);
    border: 0;
    padding: 6px 16px;
    border-radius: var(--np-radius-md);
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
  }
  .np-try-send:hover { background-color: var(--np-brand-hover); }
  .np-try-send:disabled { opacity: 0.6; cursor: wait; }
  .np-try-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .np-try-field {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    font-size: 13px;
    min-width: 0;
  }
  .np-try-field > span {
    color: var(--np-text-secondary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .np-try-field code {
    font-family: var(--np-font-mono);
    background: transparent;
    padding: 0;
  }
  .np-req { color: var(--np-danger); font-style: normal; margin-left: 2px; }
  .np-try-field input,
  .np-try-field select {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    padding: 6px 10px;
    color: var(--np-text-primary);
    font-size: 13px;
    font-family: inherit;
    outline: 0;
    box-sizing: border-box;
  }
  .np-try-field select {
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 12px 12px;
    padding-right: 32px;
  }
  .np-try-field input:focus,
  .np-try-field select:focus {
    border-color: var(--np-brand);
  }
  .np-try-group {
    border-top: 1px solid var(--np-divider);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .np-try-group:first-child { border-top: 0; }
  .np-try-group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: transparent;
    border: 0;
    padding: 12px 0 4px;
    width: 100%;
    cursor: pointer;
    color: inherit;
    text-align: left;
    font: inherit;
  }
  .np-try-group:first-child .np-try-group-head { padding-top: 0; }
  .np-try-group-head:hover .np-try-group-label,
  .np-try-group-head:focus-visible .np-try-group-label {
    color: var(--np-text-secondary);
  }
  .np-try-group-head:hover .np-try-group-chev,
  .np-try-group-head:focus-visible .np-try-group-chev {
    color: var(--np-text-primary);
  }
  .np-try-group-head:focus { outline: none; }
  .np-try-group-head:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 2px;
    border-radius: var(--np-radius-sm);
  }
  .np-try-group-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    color: var(--np-text-muted);
  }
  .np-try-group-chev {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: var(--np-text-muted);
    transition: transform 0.15s ease, color 0.15s ease;
  }
  .np-try-group-chev.open {
    transform: rotate(90deg);
  }
  .np-try-group-fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 4px;
  }
  .np-try-result {
    padding: 0;
    border-top: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    min-width: 0;
  }
  .np-try-result-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
  }
  .np-try-result-head .np-try-group-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    color: var(--np-text-muted);
  }
  .np-try-status {
    display: inline-flex;
    align-items: center;
    padding: 3px 12px;
    border-radius: var(--np-radius-pill);
    font-weight: 700;
    font-family: var(--np-font-mono);
    font-size: 12px;
    margin: 0;
    background-color: color-mix(in srgb, var(--np-danger) 16%, transparent);
    color: var(--np-danger);
  }
  .np-try-status[data-ok='true'] {
    background-color: color-mix(in srgb, var(--np-check) 16%, transparent);
    color: var(--np-check);
  }
  .np-try-result-body {
    width: 100%;
  }
  .np-try-result-body :global(.np-editor) {
    border: 0;
    border-radius: 0;
    border-top: 1px solid var(--np-divider);
    width: 100%;
  }
  .np-try-result-body :global(.np-editor-bar) {
    display: none;
  }
  .np-try-error {
    background-color: var(--np-bg-code-block);
    color: var(--np-danger);
    border-radius: var(--np-radius-md);
    padding: 12px;
    margin: 8px 0 0;
    font-family: var(--np-font-mono);
    font-size: 12px;
    line-height: 1.5;
    overflow-x: auto;
    max-height: 320px;
  }

  .np-try-group-body {
    margin-left: -16px;
    margin-right: -16px;
    margin-bottom: -16px;
    border-top: 1px solid var(--np-border);
  }
  .np-try-group-body .np-try-group-head {
    padding: 12px 16px;
  }
  .np-try-body-editor :global(.np-editor) {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
    border-top: 1px solid var(--np-border);
    width: 100%;
  }

  .np-try-collapsed-msg {
    padding: 24px 16px 32px;
    text-align: center;
    color: var(--np-text-muted);
    font-size: 13px;
    font-style: italic;
  }
  .np-try-disabled .np-try-send {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
