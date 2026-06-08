<script lang="ts">
  export interface CodeTab {
    lang: string
    html: string
    raw: string
  }

  let { tabs }: { tabs: CodeTab[] } = $props()

  let active = $state(0)
  let copied = $state(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(tabs[active].raw)
      copied = true
      setTimeout(() => (copied = false), 1500)
    } catch {}
  }
</script>

<div class="np-code-group">
  <div class="np-code-group-bar">
    <div class="np-code-group-tabs" role="tablist">
      {#each tabs as t, i (t.lang + i)}
        <button
          role="tab"
          aria-selected={active === i}
          class:active={active === i}
          onclick={() => (active = i)}
        >{t.lang || 'text'}</button>
      {/each}
    </div>
    <button class="np-code-group-copy" onclick={copy}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  </div>
  <div class="np-code-group-body">
    {@html tabs[active]?.html ?? ''}
  </div>
</div>

<style>
  .np-code-group {
    border-radius: var(--np-radius-md);
    overflow: hidden;
    background-color: var(--np-bg-code-block);
    margin: 16px 0;
    border: 1px solid var(--np-border);
  }
  .np-code-group-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    background-color: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    height: 38px;
  }
  .np-code-group-tabs {
    display: flex;
    gap: 2px;
    flex: 1;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .np-code-group-tabs::-webkit-scrollbar { display: none; }
  .np-code-group-tabs button {
    background: transparent;
    border: 0;
    border-bottom: 2px solid transparent;
    color: rgba(229, 231, 235, 0.5);
    font-size: 12px;
    cursor: pointer;
    padding: 8px 12px;
    font-family: var(--np-font-mono);
    text-transform: lowercase;
    white-space: nowrap;
    margin-bottom: -1px;
  }
  .np-code-group-tabs button:hover {
    color: rgba(229, 231, 235, 0.9);
  }
  .np-code-group-tabs button.active {
    color: var(--np-brand);
    border-bottom-color: var(--np-brand);
  }
  .np-code-group-copy {
    background: transparent;
    border: 0;
    color: rgba(229, 231, 235, 0.7);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--np-radius-sm);
    margin-left: 8px;
  }
  .np-code-group-copy:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  .np-code-group-body :global(pre) {
    margin: 0;
    border-radius: 0;
    padding: 16px;
    background: transparent;
  }
</style>
