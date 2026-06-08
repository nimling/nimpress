<script lang="ts">
  import { onMount } from 'svelte'
  import Operation from './Operation.svelte'
  import Schema from './Schema.svelte'
  import { isFlattenedSpec, type FlattenedSpec } from './types'

  let {
    spec,
    title
  }: { spec: unknown; title?: string } = $props()

  const flat = $derived<FlattenedSpec | null>(isFlattenedSpec(spec) ? spec : null)
  const serverUrl = $derived(flat?.servers?.[0]?.url ?? '')
  const servers = $derived(flat?.servers ?? [])
  const securitySchemes = $derived(flat?.securitySchemes ?? {})

  function scrollToHash() {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    requestAnimationFrame(() => {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' })
        el.classList.add('np-flash')
        setTimeout(() => el.classList.remove('np-flash'), 1200)
      }
    })
  }

  onMount(() => {
    scrollToHash()
    const onHash = () => scrollToHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
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
      <section class="np-tag-card">
        <header class="np-tag-head" id={`tag/${tag.name}`}>
          <h2>{tag.name}</h2>
          <span class="np-tag-count">{tag.operations.length} endpoint{tag.operations.length === 1 ? '' : 's'}</span>
        </header>
        <div class="np-tag-ops">
          {#each tag.operations as op, oi (op.id || `op-${ti}-${oi}`)}
            <Operation {op} {serverUrl} {servers} {securitySchemes} />
          {/each}
        </div>
      </section>
    {/each}

    {#if Object.keys(flat.schemas).length}
      <section class="np-schemas-card">
        <header class="np-tag-head">
          <h2>Schemas</h2>
          <span class="np-tag-count">{Object.keys(flat.schemas).length} model{Object.keys(flat.schemas).length === 1 ? '' : 's'}</span>
        </header>
        <div class="np-schemas-grid">
          {#each Object.entries(flat.schemas) as [name, schema], si (name || `schema-${si}`)}
            <div id={`schema/${name}`} class="np-schema-block">
              <h3>{name}</h3>
              <Schema {schema} />
            </div>
          {/each}
        </div>
      </section>
    {/if}
  </div>
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
</style>
