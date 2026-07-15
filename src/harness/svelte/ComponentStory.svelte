<script lang="ts">
  import { useHarness } from './context.svelte'
  const ctx = useHarness()
</script>

{#if ctx.component}
  {@const Story = ctx.component}
  <Story {...ctx.props} />
{/if}
