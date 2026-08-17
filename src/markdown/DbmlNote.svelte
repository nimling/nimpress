<script lang="ts">
  import type { ErdNote } from '../dbml/erd'

  let { data }: { data: ErdNote } = $props()
</script>

<div class="np-erd-note">
  {#if data.title}
    <span class="np-erd-note-title">{data.title}</span>
  {/if}
  <p class="np-erd-note-body">{data.body}</p>
</div>

<style>
  .np-erd-note {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--np-border);
    border-left: 3px solid var(--np-tip);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-surface);
    box-shadow: var(--np-shadow-card);
    font-family: var(--np-font-sans);
  }
  .np-erd-note-title {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 650;
    color: var(--np-text-primary);
  }
  .np-erd-note-body {
    margin: 0;
    font-size: 11px;
    line-height: 1.55;
    color: var(--np-text-secondary);
    white-space: pre-line;
  }
</style>
