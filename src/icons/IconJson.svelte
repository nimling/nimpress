<script lang="ts">
  let { size = 12 }: { size?: number } = $props()
</script>

<svg class="np-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
  <path d="M5.5 2C4 2 4 3 4 4.5S4 7 2.5 8C4 9 4 9.5 4 11.5S4 14 5.5 14" />
  <path d="M10.5 2C12 2 12 3 12 4.5S12 7 13.5 8C12 9 12 9.5 12 11.5S12 14 10.5 14" />
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
