<script lang="ts">
  import { getContext } from 'svelte'
  import Schema from './Schema.svelte'
  import { SCHEMAS_CONTEXT, resolveRef, leafSchema, describeSchema, type SchemaRegistry } from './refs'

  interface Props {
    schema: unknown
    name?: string
    depth?: number
  }
  let { schema, name = '', depth = 0 }: Props = $props()

  const registry = getContext<() => SchemaRegistry>(SCHEMAS_CONTEXT)
  const reg = $derived<SchemaRegistry | null>(registry ? registry() : null)
  const resolved = $derived(resolveRef(schema, reg) as Record<string, unknown> | null)
  const meta = $derived(describeSchema(schema, reg))
  const properties = $derived(leafSchema(schema, reg)?.properties as Record<string, unknown> | undefined)

  let expanded = $state(depth < 1)
</script>

<div class="np-schema">
  <button class="np-schema-head" onclick={() => (expanded = !expanded)} disabled={!meta.expandable}>
    {#if meta.expandable}
      <span class="np-chev" class:open={expanded}>›</span>
    {:else}
      <span class="np-chev-spacer"></span>
    {/if}
    {#if name}<code class="np-schema-name">{name}</code>{/if}
    <span class="np-schema-type">{meta.typeLabel}</span>
    {#if meta.format}<span class="np-schema-format">{meta.format}</span>{/if}
    {#if resolved?.description_html}
      <span class="np-schema-desc">{@html resolved.description_html}</span>
    {:else if resolved?.description}
      <span class="np-schema-desc">{resolved.description}</span>
    {/if}
  </button>

  {#if meta.enumValues}
    <div class="np-schema-enum">
      {#each meta.enumValues as val, i (i)}
        <code class="np-schema-enum-val">{val}</code>
      {/each}
    </div>
  {/if}

  {#if expanded && properties}
    <div class="np-schema-children">
      {#each Object.entries(properties) as [key, val], i (key || `prop-${i}`)}
        <Schema schema={val} name={key} depth={depth + 1} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .np-schema { font-size: 13.5px; }
  .np-schema-head {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 4px 0;
    color: var(--np-text-primary);
    text-align: left;
    width: 100%;
  }
  .np-schema-head .np-chev,
  .np-schema-head .np-chev-spacer,
  .np-schema-head .np-schema-name,
  .np-schema-head .np-schema-type {
    flex: 0 0 auto;
    padding-top: 1px;
  }
  .np-schema-head .np-schema-desc {
    flex: 1 1 auto;
    min-width: 0;
  }
  .np-schema-head:disabled { cursor: default; }
  .np-chev {
    display: inline-block;
    width: 16px;
    text-align: center;
    transition: transform 150ms ease;
    color: var(--np-text-faint);
    font-size: 18px;
    line-height: 1;
  }
  .np-chev-spacer {
    display: inline-block;
    width: 16px;
  }
  .np-chev.open { transform: rotate(90deg); }
  .np-schema-name {
    font-family: var(--np-font-mono);
    color: var(--np-text-primary);
    background: transparent;
    border: 0;
    padding: 0;
    font-weight: 600;
  }
  .np-schema-type {
    color: var(--np-text-muted);
    font-family: var(--np-font-mono);
    font-size: 12.5px;
  }
  .np-schema-format {
    flex: 0 0 auto;
    padding-top: 1px;
    color: var(--np-text-faint);
    font-family: var(--np-font-mono);
    font-size: 11.5px;
  }
  .np-schema-enum {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 4px 0 4px 24px;
  }
  .np-schema-enum-val {
    font-family: var(--np-font-mono);
    font-size: 11.5px;
    color: var(--np-text-secondary);
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    padding: 1px 6px;
  }
  .np-schema-desc {
    color: var(--np-text-secondary);
    font-size: 13px;
  }
  .np-schema-desc :global(p) { display: inline; margin: 0; }
  .np-schema-children {
    margin-left: 16px;
    padding-left: 12px;
    border-left: 1px solid var(--np-border);
    margin-top: 4px;
    margin-bottom: 4px;
  }
</style>
