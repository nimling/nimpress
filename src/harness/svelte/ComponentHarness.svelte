<script lang="ts">
  import type { Snippet } from 'svelte'
  let { children }: { children?: Snippet } = $props()
</script>

<div class="nimpress-harness">{@render children?.()}</div>

<style>
  .nimpress-harness {
    display: contents;
  }
</style>
