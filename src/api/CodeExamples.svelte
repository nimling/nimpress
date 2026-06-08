<script lang="ts">
  import type { FlatOperation } from './types'

  let { op, serverUrl = '' }: { op: FlatOperation; serverUrl?: string } = $props()

  type Lang = 'curl' | 'typescript' | 'python'
  const langs: Lang[] = ['curl', 'typescript', 'python']
  let active = $state<Lang>('curl')

  const examples = $derived.by(() => {
    const url = serverUrl + op.path
    const body = op.requestExample !== undefined ? JSON.stringify(op.requestExample, null, 2) : null
    const hasBody = body !== null && ['POST', 'PUT', 'PATCH'].includes(op.method)
    return {
      curl: hasBody
        ? `curl -X ${op.method} '${url}' \\\n  -H 'Authorization: Bearer <token>' \\\n  -H 'Content-Type: application/json' \\\n  -d '${body}'`
        : `curl -X ${op.method} '${url}' \\\n  -H 'Authorization: Bearer <token>'`,
      typescript: hasBody
        ? `await fetch('${url}', {\n  method: '${op.method}',\n  headers: {\n    Authorization: 'Bearer ' + token,\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify(${body})\n})`
        : `await fetch('${url}', {\n  method: '${op.method}',\n  headers: { Authorization: 'Bearer ' + token }\n})`,
      python: hasBody
        ? `import requests\nrequests.${op.method.toLowerCase()}('${url}', json=${body}, headers={'Authorization': f'Bearer {token}'})`
        : `import requests\nrequests.${op.method.toLowerCase()}('${url}', headers={'Authorization': f'Bearer {token}'})`
    } as Record<Lang, string>
  })
</script>

<div class="np-examples">
  <header class="np-examples-head">
    <span class="np-examples-title">Examples</span>
  </header>
  <div class="np-examples-bar">
    {#each langs as l (l)}
      <button class:active={active === l} onclick={() => (active = l)}>{l}</button>
    {/each}
  </div>
  <pre><code>{examples[active]}</code></pre>
</div>

<style>
  .np-examples {
    border-radius: var(--np-radius-md);
    overflow: hidden;
    background-color: var(--np-bg-code-block);
    color: var(--np-text-code-block);
    border: 1px solid var(--np-border);
  }
  .np-examples-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
  }
  .np-examples-title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    color: var(--np-text-secondary);
  }
  .np-examples-bar {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background-color: rgba(255, 255, 255, 0.04);
  }
  button {
    background: transparent;
    border: 0;
    color: rgba(229, 231, 235, 0.6);
    font-size: 12px;
    padding: 4px 10px;
    border-radius: var(--np-radius-sm);
    cursor: pointer;
    font-family: var(--np-font-mono);
  }
  button:hover { color: #fff; }
  button.active {
    color: var(--np-brand);
    background-color: color-mix(in srgb, var(--np-brand) 16%, transparent);
  }
  pre {
    margin: 0;
    padding: 16px;
    font-size: 12.5px;
    line-height: 1.6;
    overflow-x: auto;
  }
  code {
    font-family: var(--np-font-mono);
    background: transparent;
    border: 0;
    padding: 0;
  }
</style>
