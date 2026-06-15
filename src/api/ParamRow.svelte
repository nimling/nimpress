<script lang="ts">
  import { getContext } from 'svelte'
  import Schema from './Schema.svelte'
  import { SCHEMAS_CONTEXT, describeSchema, type SchemaRegistry } from './refs'
  import type { FlatParameter } from './types'

  let { param }: { param: FlatParameter } = $props()

  const registry = getContext<() => SchemaRegistry>(SCHEMAS_CONTEXT)
  const schema = $derived<any>(param.schema as any)
  const meta = $derived(describeSchema(schema, registry ? registry() : null))
</script>

<div class="np-param">
  <div class="np-param-head">
    <code class="np-param-name">{param.name}</code>
    <span class="np-param-type">{meta.typeLabel}</span>
    {#if meta.format}<span class="np-param-format">{meta.format}</span>{/if}
    <span class="np-param-in">{param.in}</span>
    {#if param.required}<span class="np-param-required">required</span>{/if}
  </div>
  {#if param.description_html}
    <div class="np-param-desc">{@html param.description_html}</div>
  {:else if param.description}
    <p class="np-param-desc">{param.description}</p>
  {/if}
  {#if meta.enumValues}
    <div class="np-param-enum">
      {#each meta.enumValues as val, i (i)}
        <code class="np-param-enum-val">{val}</code>
      {/each}
    </div>
  {/if}
  {#if meta.expandable}
    <div class="np-param-nested">
      <Schema schema={schema} />
    </div>
  {/if}
</div>

<style>
  .np-param {
    padding: 14px 16px;
    border-bottom: 1px solid var(--np-divider);
  }
  .np-param:last-child { border-bottom: 0; }
  .np-param-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .np-param-name {
    font-family: var(--np-font-mono);
    font-size: 14px;
    color: var(--np-text-primary);
    background: transparent;
    border: 0;
    padding: 0;
    font-weight: 600;
  }
  .np-param-type {
    font-family: var(--np-font-mono);
    font-size: 12px;
    color: var(--np-text-muted);
    padding: 2px 8px;
    border-radius: var(--np-radius-pill);
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
  }
  .np-param-format {
    font-family: var(--np-font-mono);
    font-size: 11.5px;
    color: var(--np-text-faint);
  }
  .np-param-enum {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0 0;
  }
  .np-param-enum-val {
    font-family: var(--np-font-mono);
    font-size: 11.5px;
    color: var(--np-text-secondary);
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    padding: 1px 6px;
  }
  .np-param-in {
    font-size: 10px;
    color: var(--np-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 6px;
    border-radius: var(--np-radius-sm);
    background-color: var(--np-bg-surface);
  }
  .np-param-required {
    font-size: 10px;
    color: var(--np-danger);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 6px;
    border-radius: var(--np-radius-sm);
    background-color: color-mix(in srgb, var(--np-danger) 12%, transparent);
    font-weight: 600;
  }
  .np-param-desc {
    color: var(--np-text-secondary);
    font-size: 14px;
    margin: 8px 0 0;
    line-height: 1.55;
  }
  .np-param-desc :global(p) { margin: 0 0 8px; }
  .np-param-desc :global(p:last-child) { margin-bottom: 0; }
  .np-param-desc :global(code) {
    font-family: var(--np-font-mono);
    background-color: var(--np-bg-code-inline);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    padding: 1px 5px;
    font-size: 12.5px;
  }
  .np-param-desc :global(a) {
    color: var(--np-link);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .np-param-nested {
    margin-top: 10px;
    padding-left: 16px;
    border-left: 1px solid var(--np-divider);
  }
</style>
