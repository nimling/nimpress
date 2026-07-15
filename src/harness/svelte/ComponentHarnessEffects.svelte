<script lang="ts">
  import type { Snippet } from 'svelte'
  import { useHarness } from './context.svelte'
  const ctx = useHarness()
  let { children }: { children?: Snippet } = $props()
</script>

<div class="nimpress-harness-effects" class:nimpress-harness-shadow={ctx.shadow}>
  {@render children?.()}
</div>

<style>
  .nimpress-harness-effects {
    display: contents;
  }

  .nimpress-harness-shadow > :global(*) {
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  }

  :global([data-theme='dark']) .nimpress-harness-shadow > :global(*) {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.09);
  }
</style>
