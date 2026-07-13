<script lang="ts">
  let { size = 12, open = false }: { size?: number; open?: boolean } = $props()
</script>

<svg class="np-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
  {#if open}
    <path d="M3.5 10 8 5.5 12.5 10" />
  {:else}
    <path d="M3.5 6 8 10.5 12.5 6" />
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
</style>
