<script lang="ts">
  import CodeEditor from '../markdown/CodeEditor.svelte'
  import { buildUrl, buildHeaders, hasBody, type TryState } from './tryState'
  import type { FlatOperation, SecurityScheme } from './types'

  let {
    op,
    tryState = $bindable(),
    securitySchemes = {}
  }: {
    op: FlatOperation
    tryState: TryState
    securitySchemes?: Record<string, SecurityScheme>
  } = $props()

  type Lang = 'curl' | 'typescript' | 'python' | 'go' | 'hurl' | 'dotnet'
  const langs: { key: Lang; label: string }[] = [
    { key: 'curl', label: 'curl' },
    { key: 'typescript', label: 'typescript' },
    { key: 'python', label: 'python' },
    { key: 'go', label: 'go' },
    { key: 'hurl', label: 'hurl' },
    { key: 'dotnet', label: '.net' }
  ]
  let active = $state<Lang>('curl')

  const url = $derived(buildUrl(op, tryState))
  const headers = $derived(buildHeaders(op, tryState, securitySchemes))
  const sendBody = $derived(hasBody(op, tryState))
  const body = $derived(sendBody ? tryState.bodyValue : '')

  function curlString(): string {
    const headerLines = Object.entries(headers).map(([k, v]) => `  -H '${k}: ${v}'`)
    const lines = [`curl -X ${op.method} '${url}'`, ...headerLines]
    if (sendBody) {
      lines.push(`  -d '${body.replace(/'/g, "'\\''")}'`)
    }
    return lines.join(' \\\n')
  }

  function tsString(): string {
    const headerEntries = Object.entries(headers)
      .map(([k, v]) => `    '${k}': '${v}'`)
      .join(',\n')
    const init: string[] = [`  method: '${op.method}'`]
    if (headerEntries) init.push(`  headers: {\n${headerEntries}\n  }`)
    if (sendBody) init.push(`  body: ${JSON.stringify(body)}`)
    return `const response = await fetch('${url}', {\n${init.join(',\n')}\n})\nconst data = await response.json()`
  }

  function pythonString(): string {
    const headerEntries = Object.entries(headers)
      .map(([k, v]) => `    '${k}': '${v}'`)
      .join(',\n')
    const headerArg = headerEntries ? `,\n  headers={\n${headerEntries}\n  }` : ''
    const bodyArg = sendBody ? `,\n  json=${body}` : ''
    return `import requests\n\nresponse = requests.${op.method.toLowerCase()}(\n  '${url}'${headerArg}${bodyArg}\n)\ndata = response.json()`
  }

  function goString(): string {
    const lines: string[] = []
    lines.push(`package main`)
    lines.push(``)
    lines.push(`import (`)
    lines.push(`\t"bytes"`)
    lines.push(`\t"net/http"`)
    lines.push(`)`)
    lines.push(``)
    lines.push(`func main() {`)
    if (sendBody) {
      lines.push(`\tbody := bytes.NewReader([]byte(${JSON.stringify(body)}))`)
      lines.push(`\treq, _ := http.NewRequest("${op.method}", "${url}", body)`)
    } else {
      lines.push(`\treq, _ := http.NewRequest("${op.method}", "${url}", nil)`)
    }
    for (const [k, v] of Object.entries(headers)) {
      lines.push(`\treq.Header.Set("${k}", "${v.replace(/"/g, '\\"')}")`)
    }
    lines.push(`\tresp, err := http.DefaultClient.Do(req)`)
    lines.push(`\tif err != nil { panic(err) }`)
    lines.push(`\tdefer resp.Body.Close()`)
    lines.push(`}`)
    return lines.join('\n')
  }

  function hurlString(): string {
    const lines: string[] = []
    lines.push(`${op.method} ${url}`)
    for (const [k, v] of Object.entries(headers)) {
      lines.push(`${k}: ${v}`)
    }
    if (sendBody) {
      lines.push(``)
      lines.push(body)
    }
    lines.push(``)
    lines.push(`HTTP 200`)
    return lines.join('\n')
  }

  function dotnetString(): string {
    const lines: string[] = []
    lines.push(`using System.Net.Http;`)
    lines.push(`using System.Text;`)
    lines.push(``)
    lines.push(`var client = new HttpClient();`)
    lines.push(`var request = new HttpRequestMessage(HttpMethod.${op.method[0]}${op.method.slice(1).toLowerCase()}, "${url}");`)
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === 'content-type') continue
      lines.push(`request.Headers.TryAddWithoutValidation("${k}", "${v.replace(/"/g, '\\"')}");`)
    }
    if (sendBody) {
      lines.push(`request.Content = new StringContent(${JSON.stringify(body)}, Encoding.UTF8, "application/json");`)
    }
    lines.push(`var response = await client.SendAsync(request);`)
    lines.push(`var content = await response.Content.ReadAsStringAsync();`)
    return lines.join('\n')
  }

  const generators: Record<Lang, () => string> = {
    curl: curlString,
    typescript: tsString,
    python: pythonString,
    go: goString,
    hurl: hurlString,
    dotnet: dotnetString
  }

  const code = $derived(generators[active]())
</script>

<div class="np-examples">
  <header class="np-examples-head">
    <span class="np-examples-title">Example request</span>
  </header>
  <div class="np-examples-bar">
    {#each langs as l (l.key)}
      <button class:active={active === l.key} onclick={() => (active = l.key)}>{l.label}</button>
    {/each}
  </div>
  <div class="np-examples-body">
    <CodeEditor value={code} language={active} readonly minHeight={160} maxHeight={520} title={active} showLineNumbers={false} />
  </div>
</div>

<style>
  .np-examples {
    border-radius: var(--np-radius-md);
    overflow: hidden;
    background-color: var(--np-bg-code-block);
    color: var(--np-text-code-block);
    min-width: 0;
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
    flex-wrap: nowrap;
    gap: 0;
    padding: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background-color: transparent;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .np-examples-bar::-webkit-scrollbar { display: none; height: 0; }
  .np-examples-bar > button { flex: 0 0 auto; }
  button {
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
  }
  button:hover { color: rgba(229, 231, 235, 0.95); }
  button.active {
    color: var(--np-brand);
    border-bottom-color: var(--np-brand);
    background-color: transparent;
  }
  .np-examples-body :global(.np-editor) {
    border: 0;
    border-radius: 0;
  }
</style>
