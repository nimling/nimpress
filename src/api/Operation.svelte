<script lang="ts">
  import MethodBadge from './MethodBadge.svelte'
  import ParamRow from './ParamRow.svelte'
  import CodeExamples from './CodeExamples.svelte'
  import TryPanel from './TryPanel.svelte'
  import Schema from './Schema.svelte'
  import CodeEditor from '../markdown/CodeEditor.svelte'
  import { createTryState } from './tryState'
  import type { FlatOperation, SecurityScheme, FlatServer } from './types'

  let {
    op,
    serverUrl = '',
    servers = [],
    securitySchemes = {}
  }: {
    op: FlatOperation
    serverUrl?: string
    servers?: FlatServer[]
    securitySchemes?: Record<string, SecurityScheme>
  } = $props()

  const id = $derived(`operation/${op.id}`)
  const reqBody = $derived(op.requestBody as any)
  const reqSchema = $derived(reqBody?.content?.['application/json']?.schema)
  const responses = $derived(op.responses as Record<string, any> | undefined)

  let expanded = $state(true)
  let tryState = $state(createTryState(op, servers[0]?.url ?? serverUrl, securitySchemes))
</script>

<section id={id} class="np-op-card" class:np-op-collapsed={!expanded}>
  <div class="np-op-grid">
    <div class="np-op-left">
      <header class="np-op-head">
        <div class="np-op-title-row">
          <MethodBadge method={op.method} size="lg" />
          <code class="np-op-path">{op.path}</code>
          <button
            class="np-op-toggle"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
            onclick={() => (expanded = !expanded)}
          >
            <span class="np-chev" class:open={expanded}>›</span>
          </button>
        </div>
        <h3 class="np-op-summary">{op.summary}</h3>
        {#if op.description_html}
          <div class="np-op-desc">{@html op.description_html}</div>
        {:else if op.description}
          <p class="np-op-desc">{op.description}</p>
        {/if}
      </header>

      {#if expanded && op.parameters.length}
        <div class="np-section">
          <div class="np-section-head">Parameters</div>
          <div class="np-section-body np-section-body-flush">
            {#each op.parameters as p, pi (`${p.name ?? ''}-${p.in ?? ''}-${pi}`)}
              <ParamRow param={p} />
            {/each}
          </div>
        </div>
      {/if}

      {#if expanded && reqSchema}
        <div class="np-section">
          <div class="np-section-head">Request body</div>
          <div class="np-section-body">
            <Schema schema={reqSchema} />
          </div>
        </div>
      {/if}

      {#if expanded && responses && Object.keys(responses).length}
        <div class="np-section">
          <div class="np-section-head">Responses</div>
          <div class="np-section-body">
            {#each Object.entries(responses) as [code, resp], ri (code || `resp-${ri}`)}
              <div class="np-resp">
                <div class="np-resp-row">
                  <span class="np-resp-code" data-ok={Number(code) < 400}>{code}</span>
                  {#if (resp as any).description}
                    <div class="np-resp-desc">{(resp as any).description}</div>
                  {/if}
                </div>
                {#if (resp as any).content?.['application/json']?.schema}
                  <div class="np-resp-schema">
                    <Schema schema={(resp as any).content['application/json'].schema} />
                  </div>
                {/if}
                {#if op.responseExamples?.[code] !== undefined}
                  <div class="np-resp-example">
                    <CodeEditor
                      value={JSON.stringify(op.responseExamples[code], null, 2)}
                      language="json"
                      readonly
                      title="example"
                    />
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    {#if expanded}
      <aside class="np-op-right">
        <div class="np-op-right-sticky">
          <div class="np-op-right-card">
            <TryPanel {op} {servers} {securitySchemes} bind:tryState />
            <CodeExamples {op} serverUrl={tryState.serverUrl} />
          </div>
        </div>
      </aside>
    {/if}
  </div>
</section>

<style>
  .np-op-card {
    scroll-margin-top: calc(var(--np-header-height) + 16px);
    margin-bottom: 32px;
  }
  .np-op-head {
    padding: 20px 24px;
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
  }
  .np-op-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
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
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 600;
    color: var(--np-text-primary);
  }
  .np-op-desc {
    color: var(--np-text-secondary);
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
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
  .np-op-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 24px;
  }
  .np-op-left {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .np-op-right {
    align-self: start;
    min-width: 0;
  }
  .np-op-right-sticky {
    position: sticky;
    top: calc(var(--np-header-height) + 16px);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - var(--np-header-height) - 32px);
  }
  .np-op-right-card {
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .np-op-right-card :global(.np-examples),
  .np-op-right-card :global(.np-try) {
    margin: 0;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
  }
  .np-op-right-card > :global(:first-child) {
    border-top: 0;
  }
  .np-op-right-card > :global(:not(:last-child)) {
    border-bottom: 1px solid var(--np-divider);
  }
  .np-op-right-card :global(.np-try) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
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

  .np-resp { margin-bottom: 12px; }
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
  .np-resp-desc { color: var(--np-text-secondary); font-size: 13px; }
  .np-resp-schema { margin-top: 8px; }
  .np-resp-example {
    margin-top: 8px;
  }

  @media (max-width: 1280px) {
    .np-op-grid { grid-template-columns: 1fr; }
    .np-op-right { border-left: 0; border-top: 1px solid var(--np-divider); }
    .np-op-right-sticky { position: static; }
  }
</style>
