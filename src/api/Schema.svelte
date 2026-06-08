<script lang="ts">
  let { schema, name = '', depth = 0 }: { schema: any; name?: string; depth?: number } = $props()

  let expanded = $state(depth < 1)

  const type = $derived(schema?.type ?? (schema?.$ref ? schema.$ref.split('/').pop() : 'any'))
  const hasChildren = $derived(!!(schema?.properties || schema?.items || schema?.oneOf || schema?.anyOf))
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
    {#if schema?.description_html}
      <span class="np-schema-desc">{@html schema.description_html}</span>
    {:else if schema?.description}
      <span class="np-schema-desc">{schema.description}</span>
    {/if}
  </button>

  {#if expanded && schema?.properties}
    <div class="np-schema-children">
      {#each Object.entries(schema.properties) as [key, val], i (key || `prop-${i}`)}
        <svelte:self schema={val} name={key} depth={depth + 1} />
      {/each}
    </div>
  {/if}

  {#if expanded && schema?.items}
    <div class="np-schema-children">
      <svelte:self schema={schema.items} name="[item]" depth={depth + 1} />
    </div>
  {/if}
</div>

<style>
  .np-schema { font-size: 13.5px; }
  .np-schema-head {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 4px 0;
    color: var(--np-text-primary);
    text-align: left;
    width: 100%;
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
