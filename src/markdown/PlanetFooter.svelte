<script lang="ts">
  let {
    footer = '',
    height = '70vh',
    minHeight = '480px'
  }: {
    footer?: string
    height?: string
    minHeight?: string
  } = $props()
</script>

<div class="np-planet-footer" style:--np-planet-height={height} style:--np-planet-min-height={minHeight}>
  <svg class="np-planet-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="np-earth-atmosphere" cx="50%" cy="50%" r="58%">
        <stop offset="78%" stop-color="var(--np-brand)" stop-opacity="0" />
        <stop offset="92%" stop-color="var(--np-brand)" stop-opacity="0.85" />
        <stop offset="100%" stop-color="var(--np-brand)" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="np-earth-body" cx="42%" cy="40%" r="62%">
        <stop offset="0%" stop-color="color-mix(in srgb, var(--np-brand) 90%, white)" />
        <stop offset="40%" stop-color="var(--np-brand)" />
        <stop offset="78%" stop-color="color-mix(in srgb, var(--np-brand) 50%, black)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--np-brand) 18%, black)" />
      </radialGradient>
      <radialGradient id="np-earth-night" cx="78%" cy="70%" r="60%">
        <stop offset="40%" stop-color="black" stop-opacity="0" />
        <stop offset="100%" stop-color="black" stop-opacity="0.6" />
      </radialGradient>
      <radialGradient id="np-earth-day" cx="32%" cy="26%" r="36%">
        <stop offset="0%" stop-color="white" stop-opacity="0.22" />
        <stop offset="100%" stop-color="white" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="np-planet-bottom-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--np-bg)" stop-opacity="0" />
        <stop offset="55%" stop-color="var(--np-bg)" stop-opacity="0.6" />
        <stop offset="85%" stop-color="var(--np-bg)" stop-opacity="1" />
        <stop offset="100%" stop-color="var(--np-bg)" stop-opacity="1" />
      </linearGradient>
      <clipPath id="np-earth-clip">
        <circle cx="800" cy="900" r="900" />
      </clipPath>
    </defs>

    <circle cx="800" cy="900" r="960" fill="url(#np-earth-atmosphere)" />
    <circle cx="800" cy="900" r="900" fill="url(#np-earth-body)" />

    <g clip-path="url(#np-earth-clip)">
      <g fill="color-mix(in srgb, var(--np-brand) 65%, white 20%)" opacity="0.85">
        <path d="M 720 230 Q 760 220 800 230 Q 840 240 870 270 Q 900 300 920 350 Q 940 420 920 480 Q 900 540 880 580 Q 850 630 820 640 Q 800 630 790 590 Q 780 540 790 480 Q 770 440 740 410 Q 720 360 720 300 Q 720 260 720 230 Z" />
        <path d="M 540 140 Q 620 120 700 140 Q 780 160 840 140 Q 900 130 970 140 Q 1040 160 1100 200 Q 1080 240 1020 240 Q 970 230 920 220 Q 870 210 820 220 Q 760 230 700 230 Q 640 230 590 220 Q 540 200 540 140 Z" />
        <path d="M 1140 220 Q 1200 230 1240 270 Q 1280 320 1290 380 Q 1280 440 1240 460 Q 1190 460 1170 420 Q 1160 360 1170 300 Q 1150 260 1140 220 Z" />
        <path d="M 980 500 Q 1040 520 1080 560 Q 1100 600 1080 640 Q 1040 660 1000 640 Q 970 610 980 560 Q 970 530 980 500 Z" />
        <path d="M 460 340 Q 510 330 540 360 Q 560 400 540 440 Q 510 460 480 450 Q 460 420 470 380 Q 460 360 460 340 Z" />
        <path d="M 380 480 Q 420 490 440 530 Q 440 570 420 590 Q 390 590 380 560 Q 370 520 380 480 Z" />
      </g>
    </g>

    <g opacity="0.5">
      <path d="M 360 420 Q 420 400 500 420 Q 580 430 640 420 Q 660 445 640 460 Q 580 480 510 465 Q 440 460 380 450 Q 350 440 360 420 Z" fill="white" />
      <path d="M 880 500 Q 980 480 1080 500 Q 1180 520 1240 505 Q 1255 530 1230 545 Q 1140 560 1050 555 Q 960 550 890 540 Q 870 525 880 500 Z" fill="white" />
      <path d="M 540 630 Q 620 610 720 630 Q 800 645 870 635 Q 880 655 855 665 Q 780 680 700 670 Q 620 665 560 660 Q 530 655 540 630 Z" fill="white" />
      <path d="M 1080 700 Q 1160 680 1240 700 Q 1260 720 1240 735 Q 1180 745 1110 740 Q 1085 730 1080 700 Z" fill="white" />
    </g>

    <circle cx="800" cy="900" r="900" fill="url(#np-earth-day)" />
    <circle cx="800" cy="900" r="900" fill="url(#np-earth-night)" />

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
    margin: -200px 0 0;
    padding: 0;
    box-sizing: border-box;
    height: var(--np-planet-height);
    min-height: var(--np-planet-min-height);
    pointer-events: none;
    z-index: 0;
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
    bottom: 42px;
    margin: 0;
    text-align: center;
    color: var(--np-text-secondary);
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-line;
    pointer-events: auto;
    z-index: 1;
  }
</style>
