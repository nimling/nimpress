<script lang="ts">
  let { size = 12 }: { size?: number } = $props()
</script>

<svg class="np-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
  <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
  <path d="M4.5 6.5 7 8.5 4.5 10.5M8.5 10.5h3" />
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
