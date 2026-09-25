<script lang="ts">
  import StockTabs from './Tabs.svelte'
  import { themed } from '../framework/components'

  const Tabs = themed('Tabs', StockTabs)

  export interface CodeTab {
    lang: string
    html: string
    raw: string
  }

  let { tabs }: { tabs: CodeTab[] } = $props()

  let active = $state(0)
  let copied = $state(false)

  const entries = $derived(tabs.map((t) => ({ label: t.lang || 'text', id: `tab-${t.lang || 'text'}` })))

  async function copy() {
    try {
      await navigator.clipboard.writeText(tabs[active].raw)
      copied = true
      setTimeout(() => (copied = false), 1500)
    } catch {}
  }
</script>

<Tabs tabs={entries} code bind:active>
  {#snippet bar()}
    <button class="np-code-group-copy" onclick={copy}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  {/snippet}
  {#snippet panel(_tab, i)}
    {@html tabs[i]?.html ?? ''}
  {/snippet}
</Tabs>

<style>
  .np-code-group-copy {
    background: transparent;
    border: 0;
    color: var(--np-code-bar-text);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--np-radius-sm);
    margin-left: 8px;
  }
  .np-code-group-copy:hover {
    background-color: var(--np-code-bar-hover);
    color: var(--np-code-bar-text-active);
  }
</style>
