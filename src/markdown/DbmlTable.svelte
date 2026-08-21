<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'
  import type { ErdColumn, ErdTable } from '../dbml/erd'

  let { data }: { data: ErdTable } = $props()

  function open(event: MouseEvent, column: ErdColumn) {
    if (!column.link && !column.target) return
    event.stopPropagation()
    ;(event.currentTarget as HTMLElement).dispatchEvent(
      new CustomEvent('np-erd-open', {
        bubbles: true,
        detail: { link: column.link, target: column.target, table: data.id, column: column.name }
      })
    )
  }
</script>

<div class="np-erd-table" style:--np-erd-accent={data.color || 'var(--np-brand)'}>
  <header class="np-erd-table-head">
    <span class="np-erd-table-name">{data.name}</span>
    {#if data.note}
      <span class="np-erd-table-note">{data.note}</span>
    {/if}
  </header>
  <ul class="np-erd-columns">
    {#each data.columns as column, index (column.name)}
      <li class="np-erd-column" class:np-erd-column-key={column.pk}>
        <Handle type="source" position={Position.Left} id={`l-${index}`} />
        <Handle type="target" position={Position.Left} id={`l-${index}`} />
        {#if column.link || column.target}
          <button
            type="button"
            class="np-erd-column-hit nodrag"
            title={column.note || column.link || 'Open'}
            onclick={(event) => open(event, column)}
          >
            <span class="np-erd-column-name">{column.name}</span>
            <span class="np-erd-column-flags">
              {#if column.pk}<span class="np-erd-flag np-erd-flag-pk">PK</span>{/if}
              {#if column.fk}<span class="np-erd-flag np-erd-flag-fk">FK</span>{/if}
              {#if column.unique && !column.pk}<span class="np-erd-flag">U</span>{/if}
            </span>
            {#if column.linkLabel}
              <span class="np-erd-column-link">{column.linkLabel}</span>
            {/if}
            <span class="np-erd-column-type">{column.type}</span>
          </button>
        {:else}
          <span class="np-erd-column-name" title={column.note}>{column.name}</span>
          <span class="np-erd-column-flags">
            {#if column.pk}<span class="np-erd-flag np-erd-flag-pk">PK</span>{/if}
            {#if column.fk}<span class="np-erd-flag np-erd-flag-fk">FK</span>{/if}
            {#if column.unique && !column.pk}<span class="np-erd-flag">U</span>{/if}
          </span>
          <span class="np-erd-column-type">{column.type}</span>
        {/if}
        <Handle type="source" position={Position.Right} id={`r-${index}`} />
        <Handle type="target" position={Position.Right} id={`r-${index}`} />
      </li>
    {/each}
  </ul>
  {#if data.indexes.length}
    <footer class="np-erd-indexes">
      {#each data.indexes as index (index.name)}
        <span class="np-erd-index">
          {index.unique ? 'unique' : 'index'}
          <em>{index.columns.join(', ')}</em>
        </span>
      {/each}
    </footer>
  {/if}
</div>

<style>
  .np-erd-table {
    width: 100%;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-card);
    box-shadow: var(--np-shadow-card);
    font-family: var(--np-font-sans);
    overflow: hidden;
  }
  .np-erd-table-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 9px 12px;
    background-color: var(--np-erd-accent);
    color: var(--np-text-on-brand);
  }
  .np-erd-table-name {
    font-size: 13px;
    font-weight: 650;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }
  .np-erd-table-note {
    font-size: 10px;
    line-height: 1.3;
    opacity: 0.82;
  }
  .np-erd-columns {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .np-erd-column {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 26px;
    padding: 0 12px;
    border-top: 1px solid var(--np-divider);
    font-size: 12px;
    line-height: 1;
  }
  .np-erd-column-hit {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    margin: 0 -12px;
    padding: 0 12px;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .np-erd-column-hit:hover {
    background-color: color-mix(in srgb, var(--np-brand) 12%, transparent);
  }
  .np-erd-column-hit:hover .np-erd-column-name {
    color: var(--np-brand);
  }
  .np-erd-column-hit:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: -2px;
  }
  .np-erd-column-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--np-font-mono);
    color: var(--np-text-primary);
  }
  .np-erd-column-key .np-erd-column-name {
    font-weight: 650;
  }
  .np-erd-column-flags {
    display: flex;
    gap: 3px;
    flex: 0 0 auto;
  }
  .np-erd-flag {
    padding: 1px 4px;
    border-radius: var(--np-radius-sm);
    background-color: var(--np-bg-surface);
    color: var(--np-text-faint);
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .np-erd-flag-pk {
    background-color: var(--np-brand-soft);
    color: var(--np-brand);
  }
  .np-erd-flag-fk {
    background-color: color-mix(in srgb, var(--np-note) 16%, transparent);
    color: var(--np-note);
  }
  .np-erd-column-link {
    flex: 0 0 auto;
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 1px 6px;
    border-radius: var(--np-radius-pill);
    background-color: var(--np-brand-soft);
    color: var(--np-brand);
    font-size: 9px;
    font-weight: 650;
  }
  .np-erd-column-type {
    flex: 0 0 auto;
    font-family: var(--np-font-mono);
    font-size: 11px;
    color: var(--np-text-faint);
  }
  .np-erd-indexes {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 12px 8px;
    border-top: 1px solid var(--np-divider);
    background-color: var(--np-bg-surface);
  }
  .np-erd-index {
    font-family: var(--np-font-mono);
    font-size: 10px;
    color: var(--np-text-faint);
  }
  .np-erd-index em {
    font-style: normal;
    color: var(--np-text-muted);
  }
  .np-erd-column :global(.svelte-flow__handle) {
    width: 1px;
    height: 1px;
    min-width: 0;
    min-height: 0;
    border: 0;
    opacity: 0;
    background: transparent;
  }
</style>
