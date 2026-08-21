<script lang="ts">
  let { size = 16 }: { size?: number } = $props()
</script>

<svg class="np-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
  <path d="M8 2v8" />
  <path d="M4.5 7.5 8 11l3.5-3.5" />
  <path d="M2.5 13h11" />
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
