<script lang="ts">
  let {
    footer = '',
    height = '80vh',
    minHeight = '520px'
  }: {
    footer?: string
    height?: string
    minHeight?: string
  } = $props()
</script>

<div class="np-planet-footer" style:--np-planet-height={height} style:--np-planet-min-height={minHeight}>
  <svg class="np-planet-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    <defs>
      <radialGradient id="np-earth-atmosphere" cx="50%" cy="100%" r="62%">
        <stop offset="78%" stop-color="#7aa7ff" stop-opacity="0" />
        <stop offset="92%" stop-color="#6da0ff" stop-opacity="0.7" />
        <stop offset="100%" stop-color="#3d63bd" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="np-earth-ocean" cx="42%" cy="42%" r="64%">
        <stop offset="0%" stop-color="#2a4d8a" />
        <stop offset="55%" stop-color="#1a3463" />
        <stop offset="90%" stop-color="#0c1d3f" />
        <stop offset="100%" stop-color="#06122a" />
      </radialGradient>
      <radialGradient id="np-earth-shadow" cx="78%" cy="68%" r="58%">
        <stop offset="35%" stop-color="black" stop-opacity="0" />
        <stop offset="100%" stop-color="black" stop-opacity="0.55" />
      </radialGradient>
      <radialGradient id="np-earth-highlight" cx="32%" cy="28%" r="32%">
        <stop offset="0%" stop-color="white" stop-opacity="0.18" />
        <stop offset="100%" stop-color="white" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="np-planet-bottom-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--np-bg)" stop-opacity="0" />
        <stop offset="70%" stop-color="var(--np-bg)" stop-opacity="0.6" />
        <stop offset="100%" stop-color="var(--np-bg)" stop-opacity="1" />
      </linearGradient>
      <clipPath id="np-earth-clip">
        <circle cx="800" cy="1200" r="900" />
      </clipPath>
    </defs>

    <circle cx="800" cy="1200" r="940" fill="url(#np-earth-atmosphere)" />
    <circle cx="800" cy="1200" r="900" fill="url(#np-earth-ocean)" />

    <g clip-path="url(#np-earth-clip)" opacity="0.78">
      <path d="M 360 360 Q 430 340 510 360 T 660 380 Q 720 410 720 450 Q 680 470 620 460 T 480 470 Q 430 460 380 440 T 360 360 Z" fill="#2c6b3a" />
      <path d="M 760 330 Q 820 320 870 350 Q 900 380 880 420 Q 840 450 790 440 Q 750 420 760 380 Z" fill="#2a7a44" />
      <path d="M 940 310 Q 1020 320 1080 380 Q 1120 440 1080 500 Q 1040 540 970 530 Q 920 510 920 470 Q 900 420 920 380 Q 920 340 940 310 Z" fill="#3a8a4d" />
      <path d="M 880 540 Q 920 560 960 580 Q 1000 610 980 660 Q 940 690 890 680 Q 850 660 850 620 Q 850 580 880 540 Z" fill="#2a6238" />
      <path d="M 1140 440 Q 1200 460 1240 510 Q 1260 560 1230 600 Q 1190 620 1150 600 Q 1120 570 1130 530 Q 1120 480 1140 440 Z" fill="#358043" />
      <path d="M 1230 360 Q 1280 370 1310 410 Q 1320 450 1290 470 Q 1250 460 1240 420 Q 1220 390 1230 360 Z" fill="#3a8a4d" />
      <path d="M 460 580 Q 520 590 560 620 Q 580 660 560 690 Q 520 700 480 680 Q 450 650 460 620 Q 450 600 460 580 Z" fill="#2c6b3a" />
      <path d="M 700 700 Q 760 720 800 760 Q 820 800 790 830 Q 740 840 700 820 Q 670 790 680 750 Q 680 720 700 700 Z" fill="#2a6238" />
    </g>

    <g opacity="0.42">
      <ellipse cx="540" cy="540" rx="120" ry="22" fill="white" />
      <ellipse cx="900" cy="600" rx="170" ry="26" fill="white" />
      <ellipse cx="720" cy="700" rx="100" ry="18" fill="white" />
      <ellipse cx="1080" cy="660" rx="140" ry="22" fill="white" />
    </g>

    <circle cx="800" cy="1200" r="900" fill="url(#np-earth-highlight)" />
    <circle cx="800" cy="1200" r="900" fill="url(#np-earth-shadow)" />

    <rect x="0" y="0" width="1600" height="1000" fill="url(#np-planet-bottom-fade)" />
  </svg>
  {#if footer}
    <p class="np-planet-text">{footer}</p>
  {/if}
</div>

<style>
  .np-planet-footer {
    position: relative;
    width: 100%;
    margin: -120px 0 0;
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
    width: 100%;
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
