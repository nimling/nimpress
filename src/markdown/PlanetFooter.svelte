<script lang="ts">
  let {
    footer = '',
    height = '70vh',
    minHeight = '420px'
  }: {
    footer?: string
    height?: string
    minHeight?: string
  } = $props()
</script>

<div class="np-planet-footer" style:--np-planet-height={height} style:--np-planet-min-height={minHeight}>
  <svg class="np-planet-svg" viewBox="0 0 1600 800" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    <defs>
      <radialGradient id="np-planet-atmosphere" cx="50%" cy="100%" r="68%">
        <stop offset="78%" stop-color="var(--np-brand)" stop-opacity="0" />
        <stop offset="92%" stop-color="var(--np-brand)" stop-opacity="0.55" />
        <stop offset="100%" stop-color="var(--np-brand)" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="np-planet-surface" cx="50%" cy="120%" r="120%">
        <stop offset="0%" stop-color="var(--np-brand)" stop-opacity="0.95" />
        <stop offset="55%" stop-color="var(--np-brand)" stop-opacity="0.55" />
        <stop offset="100%" stop-color="var(--np-bg)" stop-opacity="1" />
      </radialGradient>
      <linearGradient id="np-planet-bottom-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="55%" stop-color="var(--np-bg)" stop-opacity="0" />
        <stop offset="100%" stop-color="var(--np-bg)" stop-opacity="1" />
      </linearGradient>
      <radialGradient id="np-planet-highlight" cx="40%" cy="35%" r="32%">
        <stop offset="0%" stop-color="white" stop-opacity="0.12" />
        <stop offset="100%" stop-color="white" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="np-planet-shadow" cx="70%" cy="55%" r="38%">
        <stop offset="0%" stop-color="black" stop-opacity="0" />
        <stop offset="100%" stop-color="black" stop-opacity="0.25" />
      </radialGradient>
    </defs>

    <circle cx="800" cy="900" r="820" fill="url(#np-planet-atmosphere)" />
    <circle cx="800" cy="900" r="760" fill="url(#np-planet-surface)" />
    <circle cx="800" cy="900" r="760" fill="url(#np-planet-highlight)" />
    <circle cx="800" cy="900" r="760" fill="url(#np-planet-shadow)" />

    <ellipse cx="540" cy="220" rx="90" ry="14" fill="var(--np-brand)" opacity="0.32" />
    <ellipse cx="1080" cy="260" rx="120" ry="18" fill="var(--np-brand)" opacity="0.28" />
    <ellipse cx="700" cy="320" rx="70" ry="11" fill="var(--np-brand)" opacity="0.34" />
    <ellipse cx="980" cy="380" rx="100" ry="14" fill="var(--np-brand)" opacity="0.24" />

    <rect x="0" y="0" width="1600" height="800" fill="url(#np-planet-bottom-fade)" />
  </svg>
  {#if footer}
    <p class="np-planet-text">{footer}</p>
  {/if}
</div>

<style>
  .np-planet-footer {
    position: relative;
    width: 100%;
    margin: -120px calc(var(--np-planet-overshoot, -32px)) 0;
    padding: 0;
    box-sizing: border-box;
    height: var(--np-planet-height);
    min-height: var(--np-planet-min-height);
    overflow: hidden;
    pointer-events: none;
    z-index: 1;
  }
  .np-planet-svg {
    position: absolute;
    inset: 0;
    width: calc(100% + 2px);
    height: 100%;
    display: block;
  }
  .np-planet-text {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 28px;
    margin: 0;
    text-align: center;
    color: var(--np-text-faint);
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-line;
    pointer-events: auto;
  }
</style>
