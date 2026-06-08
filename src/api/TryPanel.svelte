<script lang="ts">
  import CodeEditor from '../markdown/CodeEditor.svelte'
  import type { FlatOperation, SecurityScheme, FlatServer } from './types'
  import { buildUrl, buildHeaders, type TryState } from './tryState'

  let {
    op,
    servers = [],
    securitySchemes = {},
    state = $bindable()
  }: {
    op: FlatOperation
    servers?: FlatServer[]
    securitySchemes?: Record<string, SecurityScheme>
    state: TryState
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
      if (state.selectedScheme && obj[state.selectedScheme]) {
        state.authValue = obj[state.selectedScheme]
      }
    } catch {}
  }

  function saveAuth() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const obj = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      if (state.selectedScheme) obj[state.selectedScheme] = state.authValue
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
    } catch {}
  }

  $effect(() => {
    state.selectedScheme
    loadAuth()
  })

  $effect(() => {
    state.authValue
    if (state.selectedScheme) saveAuth()
  })

  const pathParams = $derived(op.parameters.filter((p) => p.in === 'path'))
  const queryParams = $derived(op.parameters.filter((p) => p.in === 'query'))
  const headerParams = $derived(op.parameters.filter((p) => p.in === 'header'))

  async function send() {
    sending = true
    responseStatus = null
    responseBody = ''
    responseError = null
    try {
      const url = buildUrl(op, state)
      const init: RequestInit = {
        method: op.method,
        headers: buildHeaders(op, state, securitySchemes)
      }
      if (state.bodyValue && ['POST', 'PUT', 'PATCH'].includes(op.method)) {
        init.body = state.bodyValue
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

<div class="np-try">
  <header class="np-try-head">
    <span class="np-try-title">Try it</span>
    <button class="np-try-send" onclick={send} disabled={sending}>
      {sending ? 'Sending…' : 'Send'}
    </button>
  </header>

  <div class="np-try-body">
    {#if servers.length > 0}
      <label class="np-try-field">
        <span>Server</span>
        <select bind:value={state.serverUrl}>
          {#each servers as s, i (s.url || `srv-${i}`)}
            <option value={s.url}>{s.url}</option>
          {/each}
        </select>
      </label>
    {/if}

    {#if schemeNames.length > 0}
      <label class="np-try-field">
        <span>Auth</span>
        <select bind:value={state.selectedScheme}>
          <option value="">None</option>
          {#each schemeNames as name (name)}
            <option value={name}>{name} ({securitySchemes[name].type ?? 'auth'})</option>
          {/each}
        </select>
      </label>

      {#if state.selectedScheme}
        <label class="np-try-field">
          <span>{securitySchemes[state.selectedScheme].scheme === 'bearer' ? 'Token' : 'Value'}</span>
          <input
            type="password"
            bind:value={state.authValue}
            placeholder={securitySchemes[state.selectedScheme].bearerFormat ?? 'enter value'}
          />
        </label>
      {/if}
    {/if}

    {#if pathParams.length > 0}
      <div class="np-try-group">
        <div class="np-try-group-label">Path</div>
        {#each pathParams as p (p.name)}
          <label class="np-try-field">
            <span><code>{p.name}</code>{#if p.required}<em class="np-req">*</em>{/if}</span>
            <input bind:value={state.pathValues[p.name]} placeholder={p.example !== undefined ? String(p.example) : ''} />
          </label>
        {/each}
      </div>
    {/if}

    {#if queryParams.length > 0}
      <div class="np-try-group">
        <div class="np-try-group-label">Query</div>
        {#each queryParams as p (p.name)}
          <label class="np-try-field">
            <span><code>{p.name}</code>{#if p.required}<em class="np-req">*</em>{/if}</span>
            <input bind:value={state.queryValues[p.name]} placeholder={p.example !== undefined ? String(p.example) : ''} />
          </label>
        {/each}
      </div>
    {/if}

    {#if headerParams.length > 0}
      <div class="np-try-group">
        <div class="np-try-group-label">Headers</div>
        {#each headerParams as p (p.name)}
          <label class="np-try-field">
            <span><code>{p.name}</code>{#if p.required}<em class="np-req">*</em>{/if}</span>
            <input bind:value={state.headerValues[p.name]} placeholder={p.example !== undefined ? String(p.example) : ''} />
          </label>
        {/each}
      </div>
    {/if}

    {#if ['POST', 'PUT', 'PATCH'].includes(op.method)}
      <div class="np-try-group">
        <div class="np-try-group-label">Body</div>
        <CodeEditor bind:value={state.bodyValue} language="json" title="body" />
      </div>
    {/if}
  </div>

  {#if responseStatus !== null || responseError}
    <div class="np-try-result">
      <div class="np-try-group-label">Response</div>
      {#if responseError}
        <pre class="np-try-error">{responseError}</pre>
      {:else}
        <div class="np-try-status" data-ok={responseStatus !== null && responseStatus < 400}>
          {responseStatus}
        </div>
        {#if responseBody}
          <CodeEditor value={responseBody} language="json" readonly title="response" />
        {/if}
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
  .np-try-field input:focus,
  .np-try-field select:focus {
    border-color: var(--np-brand);
  }
  .np-try-group {
    border-top: 1px solid var(--np-divider);
    padding-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .np-try-group:first-child { border-top: 0; padding-top: 0; }
  .np-try-group-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    color: var(--np-text-muted);
  }
  .np-try-result {
    padding: 16px;
    border-top: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    min-width: 0;
  }
  .np-try-status {
    display: inline-block;
    padding: 4px 10px;
    border-radius: var(--np-radius-pill);
    font-weight: 700;
    font-family: var(--np-font-mono);
    margin: 6px 0;
    background-color: color-mix(in srgb, var(--np-danger) 16%, transparent);
    color: var(--np-danger);
  }
  .np-try-status[data-ok='true'] {
    background-color: color-mix(in srgb, var(--np-check) 16%, transparent);
    color: var(--np-check);
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
</style>
