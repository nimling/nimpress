<script lang="ts">
  let { size = 12 }: { size?: number } = $props()
</script>

<svg class="np-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
  <rect class="np-icon-dim" x="5" y="5" width="9" height="9" rx="1.5" />
  <rect x="2" y="2" width="9" height="9" rx="1.5" />
</svg>

<style>
  .np-icon {
    flex: 0 0 auto;
    fill: var(--np-bg, transparent);
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .np-icon-dim {
    fill: none;
    opacity: 0.45;
  }
</style>
