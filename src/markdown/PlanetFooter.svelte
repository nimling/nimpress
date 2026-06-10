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
  <svg class="np-planet-svg" viewBox="0 0 1600 1200" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    <defs>
      <radialGradient id="np-earth-atmosphere" cx="50%" cy="100%" r="64%">
        <stop offset="76%" stop-color="var(--np-brand)" stop-opacity="0" />
        <stop offset="92%" stop-color="var(--np-brand)" stop-opacity="0.85" />
        <stop offset="100%" stop-color="var(--np-brand)" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="np-earth-body" cx="42%" cy="42%" r="62%">
        <stop offset="0%" stop-color="color-mix(in srgb, var(--np-brand) 90%, white)" />
        <stop offset="40%" stop-color="var(--np-brand)" />
        <stop offset="78%" stop-color="color-mix(in srgb, var(--np-brand) 50%, black)" />
        <stop offset="100%" stop-color="color-mix(in srgb, var(--np-brand) 18%, black)" />
      </radialGradient>
      <radialGradient id="np-earth-night" cx="78%" cy="72%" r="62%">
        <stop offset="40%" stop-color="black" stop-opacity="0" />
        <stop offset="100%" stop-color="black" stop-opacity="0.65" />
      </radialGradient>
      <radialGradient id="np-earth-day" cx="32%" cy="28%" r="36%">
        <stop offset="0%" stop-color="white" stop-opacity="0.22" />
        <stop offset="100%" stop-color="white" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="np-planet-bottom-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--np-bg)" stop-opacity="0" />
        <stop offset="45%" stop-color="var(--np-bg)" stop-opacity="0.45" />
        <stop offset="80%" stop-color="var(--np-bg)" stop-opacity="0.95" />
        <stop offset="100%" stop-color="var(--np-bg)" stop-opacity="1" />
      </linearGradient>
      <clipPath id="np-earth-clip">
        <circle cx="800" cy="1320" r="960" />
      </clipPath>
    </defs>

    <circle cx="800" cy="1320" r="1010" fill="url(#np-earth-atmosphere)" />
    <circle cx="800" cy="1320" r="960" fill="url(#np-earth-body)" />

    <g clip-path="url(#np-earth-clip)">
      <g fill="color-mix(in srgb, var(--np-brand) 65%, white 20%)" opacity="0.85">
        <path d="M 720 470 Q 760 460 800 470 Q 840 480 870 510 Q 900 540 920 590 Q 940 660 920 720 Q 900 780 880 820 Q 850 870 820 880 Q 800 870 790 830 Q 780 780 790 720 Q 770 680 740 650 Q 720 600 720 540 Q 720 500 720 470 Z" />
        <path d="M 540 380 Q 620 360 700 380 Q 780 400 840 380 Q 900 370 970 380 Q 1040 400 1100 440 Q 1080 480 1020 480 Q 970 470 920 460 Q 870 450 820 460 Q 760 470 700 470 Q 640 470 590 460 Q 540 440 540 380 Z" />
        <path d="M 1140 460 Q 1200 470 1240 510 Q 1280 560 1290 620 Q 1280 680 1240 700 Q 1190 700 1170 660 Q 1160 600 1170 540 Q 1150 500 1140 460 Z" />
        <path d="M 980 740 Q 1040 760 1080 800 Q 1100 840 1080 880 Q 1040 900 1000 880 Q 970 850 980 800 Q 970 770 980 740 Z" />
        <path d="M 460 580 Q 510 570 540 600 Q 560 640 540 680 Q 510 700 480 690 Q 460 660 470 620 Q 460 600 460 580 Z" />
        <path d="M 380 720 Q 420 730 440 770 Q 440 810 420 830 Q 390 830 380 800 Q 370 760 380 720 Z" />
      </g>
    </g>

    <g opacity="0.55">
      <path d="M 360 660 Q 420 640 500 660 Q 580 670 640 660 Q 660 685 640 700 Q 580 720 510 705 Q 440 700 380 690 Q 350 680 360 660 Z" fill="white" />
      <path d="M 880 740 Q 980 720 1080 740 Q 1180 760 1240 745 Q 1255 770 1230 785 Q 1140 800 1050 795 Q 960 790 890 780 Q 870 765 880 740 Z" fill="white" />
      <path d="M 540 870 Q 620 850 720 870 Q 800 885 870 875 Q 880 895 855 905 Q 780 920 700 910 Q 620 905 560 900 Q 530 895 540 870 Z" fill="white" />
      <path d="M 1080 940 Q 1160 920 1240 940 Q 1260 960 1240 975 Q 1180 985 1110 980 Q 1085 970 1080 940 Z" fill="white" />
    </g>

    <circle cx="800" cy="1320" r="960" fill="url(#np-earth-day)" />
    <circle cx="800" cy="1320" r="960" fill="url(#np-earth-night)" />

    <rect x="0" y="0" width="1600" height="1200" fill="url(#np-planet-bottom-fade)" />
    <rect x="0" y="1150" width="1600" height="60" fill="var(--np-bg)" />
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
