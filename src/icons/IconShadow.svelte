<script lang="ts">
  let { size = 12 }: { size?: number } = $props()
</script>

<svg class="np-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
  <rect class="np-icon-shadow" x="5.5" y="5.5" width="8.5" height="8.5" rx="2" />
  <rect class="np-icon-face" x="2" y="2" width="9" height="9" rx="2" />
</svg>

<style>
  .np-icon {
    flex: 0 0 auto;
  }

  .np-icon-shadow {
    fill: currentColor;
    opacity: 0.35;
    stroke: none;
  }

  .np-icon-face {
    fill: var(--np-bg-surface);
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
</style>
