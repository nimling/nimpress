<script lang="ts">
  import { onMount } from 'svelte'

  let { source, display = false }: { source: string; display?: boolean } = $props()
  let html = $state('')
  let failed = $state(false)

  onMount(async () => {
    try {
      const katex = (await import('katex')).default
      html = katex.renderToString(source, { displayMode: display, output: 'mathml', throwOnError: false })
    } catch {
      failed = true
    }
  })
</script>

{#if display}
  <div class="np-math np-math-display" class:np-math-error={failed}>
    {#if failed}<code>{source}</code>{:else}{@html html}{/if}
  </div>
{:else}
  <span class="np-math" class:np-math-error={failed}>
    {#if failed}<code>{source}</code>{:else}{@html html}{/if}
  </span>
{/if}

<style>
  .np-math-display {
    display: block;
    margin: 16px 0;
    overflow-x: auto;
    text-align: center;
    font-size: 1.15em;
  }
  .np-math-error code {
    color: var(--np-danger);
  }
</style>
