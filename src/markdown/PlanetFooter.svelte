<script lang="ts">
  let {
    footer = '',
    height = '60vh',
    minHeight = '360px'
  }: {
    footer?: string
    height?: string
    minHeight?: string
  } = $props()
</script>

<div class="np-planet-footer" style:--np-planet-height={height} style:--np-planet-min-height={minHeight}>
  <svg class="np-planet-svg" viewBox="0 0 1600 800" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    <defs>
      <radialGradient id="np-planet-glow" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stop-color="var(--np-brand)" stop-opacity="0.9" />
        <stop offset="55%" stop-color="var(--np-brand)" stop-opacity="0.5" />
        <stop offset="100%" stop-color="var(--np-bg)" stop-opacity="1" />
      </radialGradient>
      <radialGradient id="np-planet-fade" cx="50%" cy="0%" r="120%">
        <stop offset="55%" stop-color="var(--np-bg)" stop-opacity="0" />
        <stop offset="100%" stop-color="var(--np-bg)" stop-opacity="1" />
      </radialGradient>
    </defs>
    <circle cx="800" cy="1100" r="900" fill="url(#np-planet-glow)" />
    <ellipse cx="560" cy="500" rx="120" ry="22" fill="var(--np-brand)" opacity="0.28" />
    <ellipse cx="1040" cy="580" rx="160" ry="28" fill="var(--np-brand)" opacity="0.22" />
    <ellipse cx="720" cy="660" rx="90" ry="16" fill="var(--np-brand)" opacity="0.3" />
    <rect x="0" y="0" width="1600" height="800" fill="url(#np-planet-fade)" />
  </svg>
  {#if footer}
    <p class="np-planet-text">{footer}</p>
  {/if}
</div>

<style>
  .np-planet-footer {
    position: relative;
    width: 100vw;
    left: 50%;
    transform: translateX(-50%);
    height: var(--np-planet-height);
    min-height: var(--np-planet-min-height);
    overflow: hidden;
    pointer-events: none;
    margin-top: -64px;
  }
  .np-planet-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .np-planet-text {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 32px;
    margin: 0;
    text-align: center;
    color: var(--np-text-faint);
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-line;
    pointer-events: auto;
  }
</style>
