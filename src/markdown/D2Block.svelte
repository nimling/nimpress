<script lang="ts">
  import type { D2Arrowhead, D2Diagram, D2Edge, D2Shape, D2Style } from '../d2/diagram'
  import DiagramViewport from './DiagramViewport.svelte'

  let { diagram, error = '', label = '' }: { diagram: string; error?: string; label?: string } = $props()

  const COLUMN = 720
  const LINE = 1.4
  const uid = `np-d2-${Math.floor(Math.random() * 1_000_000_000)}`

  const model = $derived.by((): Omit<D2Diagram, 'files'> | null => {
    if (!diagram) return null
    try {
      return JSON.parse(diagram)
    } catch {
      return null
    }
  })
  const containers = $derived(model?.shapes.filter((s) => s.container) ?? [])
  const leaves = $derived(model?.shapes.filter((s) => !s.container) ?? [])
  const ratio = $derived(model ? Math.max(model.width, COLUMN) / Math.max(model.height, 1) : 0)

  function lineY(y: number, size: number, count: number, i: number): number {
    return y + (i - (count - 1) / 2) * size * LINE
  }

  function marker(edge: number, side: 'start' | 'end', head: D2Arrowhead): string | undefined {
    return head.kind === 'none' ? undefined : `url(#${uid}-${edge}-${side})`
  }

  function dash(style: D2Style): string | undefined {
    return style.strokeDash ? `${style.strokeDash * 2} ${style.strokeDash * 2}` : undefined
  }

  function header(s: D2Shape): string {
    const r = Math.min(6, s.headerHeight / 2)
    const right = s.x + s.width
    const bottom = s.y + s.headerHeight
    return `M${s.x},${bottom} V${s.y + r} A${r},${r} 0 0 1 ${s.x + r},${s.y} H${right - r} A${r},${r} 0 0 1 ${right},${s.y + r} V${bottom} Z`
  }

  function headPath(kind: D2Arrowhead['kind']): string {
    switch (kind) {
      case 'arrow':
        return 'M0,0 L10,5 L0,10 L3,5 Z'
      case 'diamond':
        return 'M0,5 L5,0 L10,5 L5,10 Z'
      case 'box':
        return 'M1,1 H9 V9 H1 Z'
      case 'cross':
        return 'M2,2 L8,8 M8,2 L2,8'
      case 'cf-one':
        return 'M5,0 V10 M0,5 H10'
      case 'cf-one-required':
        return 'M3,0 V10 M7,0 V10 M0,5 H10'
      case 'cf-many':
        return 'M0,5 L10,0 M0,5 L10,10 M0,5 H10'
      case 'cf-many-required':
        return 'M0,0 V10 M3,5 L10,0 M3,5 L10,10 M0,5 H10'
      default:
        return 'M0,0 L10,5 L0,10 Z'
    }
  }

  function stroked(kind: D2Arrowhead['kind']): boolean {
    return kind === 'cross' || kind.startsWith('cf-')
  }
</script>

{#snippet text(lines: string[], x: number, y: number, size: number, style: D2Style, className: string)}
  {#if lines.length}
    <text
      class={className}
      x={x}
      y={y}
      text-anchor="middle"
      dominant-baseline="central"
      font-size={size}
      font-weight={style.bold ? 700 : undefined}
      font-style={style.italic ? 'italic' : undefined}
      text-decoration={style.underline ? 'underline' : undefined}
      style:fill={style.fontColor}
    >
      {#each lines as line, i}
        <tspan x={x} y={lineY(y, size, lines.length, i)}>{line}</tspan>
      {/each}
    </text>
  {/if}
{/snippet}

{#snippet shapeBody(s: D2Shape)}
  {#if s.tooltip}<title>{s.tooltip}</title>{/if}
  {#if s.style.multiple && s.outline}
    <path class="np-d2-outline np-d2-ghost" d={s.outline} transform="translate(8 -8)" style:fill={s.style.fill} style:stroke={s.style.stroke} />
  {/if}
  {#if s.outline}
    <path
      class="np-d2-outline"
      d={s.outline}
      style:fill={s.style.fill}
      style:stroke={s.style.stroke}
      style:stroke-width={s.style.strokeWidth}
      stroke-dasharray={dash(s.style)}
    />
  {/if}
  {#if s.inner}
    <path class="np-d2-outline np-d2-inner" d={s.inner} style:stroke={s.style.stroke} />
  {/if}
  {#if s.headerHeight}
    <path class="np-d2-header" d={header(s)} style:fill={s.style.stroke} />
    {#each s.rows as row, i}
      {#if i > 0}
        <line class="np-d2-row-line" x1={s.x} x2={s.x + s.width} y1={row.y - 13} y2={row.y - 13} />
      {/if}
      {#if row.constraint}
        <text class="np-d2-row-constraint" x={s.x + 12} y={row.y} dominant-baseline="central">{row.constraint}</text>
      {/if}
      <text class="np-d2-row-name" x={s.x + 14 + s.rowInset} y={row.y} dominant-baseline="central">{row.name}</text>
      <text class="np-d2-row-type" x={s.x + s.width - 14} y={row.y} text-anchor="end" dominant-baseline="central">{row.type}</text>
    {/each}
  {/if}
  {#if s.icon}
    <image class="np-d2-icon" href={s.icon} x={s.iconX} y={s.iconY} width={s.iconSize} height={s.iconSize} />
  {/if}
  {@render text(
    s.label,
    s.labelX,
    s.labelY,
    s.fontSize,
    s.container || s.headerHeight ? { bold: true, ...s.style } : s.style,
    s.headerHeight ? 'np-d2-label np-d2-label-header' : 'np-d2-label'
  )}
{/snippet}

{#snippet shape(s: D2Shape)}
  <g
    class="np-d2-shape np-d2-shape-{s.kind} np-d2-level-{Math.min(s.level, 4)}"
    class:np-d2-container={s.container}
    class:np-d2-shadow={s.style.shadow}
    class:np-d2-mono={s.kind === 'code'}
    style:opacity={s.style.opacity}
  >
    {#if s.link}
      <a href={s.link} target={/^https?:/.test(s.link) ? '_blank' : undefined} rel={/^https?:/.test(s.link) ? 'noreferrer' : undefined}>
        {@render shapeBody(s)}
      </a>
    {:else}
      {@render shapeBody(s)}
    {/if}
  </g>
{/snippet}

{#snippet edge(e: D2Edge, i: number)}
  <g class="np-d2-edge" class:np-d2-animated={e.style.animated} style:opacity={e.style.opacity} style:color={e.style.stroke}>
    <path
      class="np-d2-edge-line"
      d={e.path}
      style:stroke={e.style.stroke}
      style:stroke-width={e.style.strokeWidth}
      stroke-dasharray={dash(e.style) ?? (e.style.animated ? '6 6' : undefined)}
      marker-start={marker(i, 'start', e.source)}
      marker-end={marker(i, 'end', e.target)}
    />
    {#if e.label.length}
      <rect
        class="np-d2-edge-label-bg"
        x={e.labelX - e.labelWidth / 2}
        y={e.labelY - e.labelHeight / 2}
        width={e.labelWidth}
        height={e.labelHeight}
        rx="4"
      />
      {@render text(e.label, e.labelX, e.labelY, e.fontSize, e.style, 'np-d2-edge-label')}
    {/if}
  </g>
{/snippet}

{#snippet head(id: string, h: D2Arrowhead, color: string | undefined)}
  <marker
    {id}
    viewBox="-1 -1 12 12"
    refX={h.kind === 'circle' || h.kind === 'box' || h.kind === 'diamond' ? 10 : h.kind.startsWith('cf-') ? 10 : 9}
    refY="5"
    markerWidth={h.kind === 'diamond' ? 16 : 12}
    markerHeight="12"
    markerUnits="userSpaceOnUse"
    orient="auto-start-reverse"
    style:color={color}
  >
    {#if h.kind === 'circle'}
      <circle class="np-d2-head" class:np-d2-head-open={!h.filled} cx="5" cy="5" r="4" />
    {:else}
      <path class="np-d2-head" class:np-d2-head-open={!h.filled} class:np-d2-head-stroke={stroked(h.kind)} d={headPath(h.kind)} />
    {/if}
  </marker>
{/snippet}

<DiagramViewport kind="d2" {error} {label} ratio={error ? 0 : ratio}>
  {#if model}
    <svg
      class="np-d2-svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 {model.width} {model.height}"
      width={model.width}
      height={model.height}
      role="img"
      aria-label={label || undefined}
    >
      <defs>
        {#each model.edges as e, i}
          {#if e.source.kind !== 'none'}{@render head(`${uid}-${i}-start`, e.source, e.style.stroke)}{/if}
          {#if e.target.kind !== 'none'}{@render head(`${uid}-${i}-end`, e.target, e.style.stroke)}{/if}
        {/each}
      </defs>
      {#each containers as s (s.id)}{@render shape(s)}{/each}
      {#each model.edges as e, i (e.id)}{@render edge(e, i)}{/each}
      {#each leaves as s (s.id)}{@render shape(s)}{/each}
    </svg>
  {/if}
</DiagramViewport>

<style>
  .np-d2-svg {
    font-family: var(--np-font-sans);
    overflow: visible;
  }
  .np-d2-svg :global(.np-d2-outline) {
    fill: color-mix(in srgb, var(--np-brand) 10%, var(--np-bg-surface));
    stroke: color-mix(in srgb, var(--np-brand) 55%, var(--np-border));
    stroke-width: 1.5;
    transition: stroke 120ms ease, fill 120ms ease;
  }
  .np-d2-svg :global(.np-d2-shape:hover > .np-d2-outline),
  .np-d2-svg :global(.np-d2-shape:hover > a > .np-d2-outline) {
    stroke: var(--np-brand);
  }
  .np-d2-svg :global(.np-d2-container > .np-d2-outline) {
    fill: color-mix(in srgb, var(--np-brand) 4%, var(--np-bg-surface));
    stroke: color-mix(in srgb, var(--np-brand) 28%, var(--np-border));
  }
  .np-d2-svg :global(.np-d2-container.np-d2-level-2 > .np-d2-outline) {
    fill: color-mix(in srgb, var(--np-brand) 7%, var(--np-bg-surface));
  }
  .np-d2-svg :global(.np-d2-container.np-d2-level-3 > .np-d2-outline),
  .np-d2-svg :global(.np-d2-container.np-d2-level-4 > .np-d2-outline) {
    fill: color-mix(in srgb, var(--np-brand) 11%, var(--np-bg-surface));
  }
  .np-d2-svg :global(.np-d2-ghost) {
    opacity: 0.6;
  }
  .np-d2-svg :global(.np-d2-inner) {
    fill: none;
  }
  .np-d2-svg :global(.np-d2-shadow) {
    filter: drop-shadow(0 4px 8px color-mix(in srgb, var(--np-text-primary) 18%, transparent));
  }
  .np-d2-svg :global(.np-d2-shape-code > .np-d2-outline) {
    fill: var(--np-bg-code-block);
  }
  .np-d2-svg :global(.np-d2-label) {
    fill: var(--np-text-primary);
  }
  .np-d2-svg :global(.np-d2-mono .np-d2-label) {
    font-family: var(--np-font-mono);
    fill: var(--np-text-code-block);
  }
  .np-d2-svg :global(.np-d2-container > .np-d2-label) {
    fill: var(--np-text-secondary);
    letter-spacing: 0.01em;
  }
  .np-d2-svg :global(.np-d2-header) {
    fill: var(--np-brand);
  }
  .np-d2-svg :global(.np-d2-label-header) {
    fill: var(--np-text-on-brand);
  }
  .np-d2-svg :global(.np-d2-shape-sql_table > .np-d2-outline),
  .np-d2-svg :global(.np-d2-shape-class > .np-d2-outline) {
    fill: var(--np-bg-surface);
  }
  .np-d2-svg :global(.np-d2-row-line) {
    stroke: var(--np-divider);
  }
  .np-d2-svg :global(.np-d2-row-name),
  .np-d2-svg :global(.np-d2-row-type) {
    font-family: var(--np-font-mono);
    font-size: 13px;
  }
  .np-d2-svg :global(.np-d2-row-name) {
    fill: var(--np-text-primary);
  }
  .np-d2-svg :global(.np-d2-row-type) {
    fill: var(--np-text-muted);
  }
  .np-d2-svg :global(.np-d2-row-constraint) {
    fill: var(--np-brand);
    font-size: 10px;
    font-weight: 700;
  }
  .np-d2-svg :global(.np-d2-edge) {
    color: var(--np-text-secondary);
  }
  .np-d2-svg :global(.np-d2-edge-line) {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
  }
  .np-d2-svg :global(.np-d2-animated .np-d2-edge-line) {
    animation: np-d2-flow 0.8s linear infinite;
  }
  .np-d2-svg :global(.np-d2-edge-label-bg) {
    fill: var(--np-bg-surface);
    stroke: var(--np-border);
    stroke-width: 1;
  }
  .np-d2-svg :global(.np-d2-edge-label) {
    fill: var(--np-text-secondary);
  }
  .np-d2-svg :global(marker) {
    color: var(--np-text-secondary);
  }
  .np-d2-svg :global(.np-d2-head) {
    fill: currentColor;
    stroke: currentColor;
    stroke-width: 1;
    stroke-linejoin: round;
  }
  .np-d2-svg :global(.np-d2-head-open) {
    fill: var(--np-bg-surface);
  }
  .np-d2-svg :global(.np-d2-head-stroke) {
    fill: none;
    stroke-width: 1.5;
  }
  @keyframes -global-np-d2-flow {
    to {
      stroke-dashoffset: -12;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .np-d2-svg :global(.np-d2-animated .np-d2-edge-line) {
      animation: none;
    }
  }
</style>
