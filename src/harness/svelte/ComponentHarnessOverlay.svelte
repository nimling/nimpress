<script lang="ts">
  import { useHarness } from './context.svelte'
  const ctx = useHarness()
</script>

{#if ctx.overlay}
  {@const Overlay = ctx.overlay}
  <Overlay />
{/if}
