<script lang="ts">
  import { getContext } from 'svelte'
  import { SCHEMAS_CONTEXT, resolveRef, type SchemaRegistry } from './refs'

  let { schema, name = '', depth = 0 }: { schema: any; name?: string; depth?: number } = $props()

  const registry = getContext<() => SchemaRegistry>(SCHEMAS_CONTEXT)
  const resolved = $derived<any>(resolveRef(schema, registry ? registry() : null))

  let expanded = $state(depth < 1)

  const type = $derived(
    resolved?.type ??
      (resolved?.$ref ? String(resolved.$ref).split('/').pop() : 'any')
  )
  const hasChildren = $derived(
    !!(resolved?.properties || resolved?.items || resolved?.oneOf || resolved?.anyOf)
  )
</script>

<div class="np-schema">
  <button class="np-schema-head" onclick={() => (expanded = !expanded)} disabled={!hasChildren}>
    {#if hasChildren}
      <span class="np-chev" class:open={expanded}>›</span>
    {:else}
      <span class="np-chev-spacer"></span>
    {/if}
    {#if name}<code class="np-schema-name">{name}</code>{/if}
    <span class="np-schema-type">{type}</span>
    {#if resolved?.description_html}
      <span class="np-schema-desc">{@html resolved.description_html}</span>
    {:else if resolved?.description}
      <span class="np-schema-desc">{resolved.description}</span>
    {/if}
  </button>

  {#if expanded && resolved?.properties}
    <div class="np-schema-children">
      {#each Object.entries(resolved.properties) as [key, val], i (key || `prop-${i}`)}
        <svelte:self schema={val} name={key} depth={depth + 1} />
      {/each}
    </div>
  {/if}

  {#if expanded && resolved?.items}
    <div class="np-schema-children">
      <svelte:self schema={resolved.items} name="[item]" depth={depth + 1} />
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
