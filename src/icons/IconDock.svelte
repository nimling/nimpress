<script lang="ts">
  let { size = 12, side = 'bottom' }: { size?: number; side?: 'bottom' | 'right' } = $props()
</script>

<svg class="np-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
  <rect x="2" y="2" width="12" height="12" rx="1.5" />
  {#if side === 'bottom'}
    <rect class="np-icon-fill" x="3.5" y="9.5" width="9" height="3" rx="0.75" />
  {:else}
    <rect class="np-icon-fill" x="9.5" y="3.5" width="3" height="9" rx="0.75" />
  {/if}
</svg>

<style>
  .np-icon {
    flex: 0 0 auto;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .np-icon-fill {
    fill: currentColor;
    stroke: none;
  }
</style>
