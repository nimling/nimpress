<script lang="ts">
  import { onMount, tick } from 'svelte'
  import RoadmapBlob from './RoadmapBlob.svelte'
  import type { RoadmapEntry, RoadmapKind } from '../types'

  const NODE_W_BASE = 320

  let {
    entry,
    side,
    x,
    y,
    w,
    h,
    onClick,
    onEnter,
    onLeave,
    onMeasure
  }: {
    entry: RoadmapEntry
    side: 'left' | 'right'
    x: number
    y: number
    w: number
    h: number
    onClick: (e: MouseEvent) => void
    onEnter: (e: Event) => void
    onLeave: () => void
    onMeasure?: (href: string, visW: number, visH: number) => void
  } = $props()

  let hostEl: HTMLAnchorElement
  let lastVisW = 0
  let lastVisH = 0

  onMount(() => {
    if (!onMeasure) return
    let raf = 0
    let ro: ResizeObserver | null = null
    const measure = () => {
      if (!hostEl) return
      const rect = hostEl.getBoundingClientRect()
      const visW = rect.width
      const visH = rect.height
      if (visW <= 0 || visH <= 0) return
      if (Math.abs(visW - lastVisW) < 1 && Math.abs(visH - lastVisH) < 1) return
      lastVisW = visW
      lastVisH = visH
      onMeasure!(entry.href, visW, visH)
    }
    raf = requestAnimationFrame(() => {
      tick().then(measure)
    })
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure())
      ro.observe(hostEl)
    }
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  })

  function kindLabel(kind: RoadmapKind): string {
    return kind.toUpperCase()
  }

  function statusStroke(status: string): string {
    if (status === 'shipped') return 'var(--np-check)'
    if (status === 'in_progress') return 'var(--np-warning)'
    return 'var(--np-border)'
  }

  function formatDate(iso: string | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const year = d.getUTCFullYear()
    return `${day}.${month}.${year}`
  }

  const scale = $derived(w / NODE_W_BASE)
  const padY = $derived(Math.max(8, Math.round(20 * scale)))
  const padX = $derived(Math.max(10, Math.round(24 * scale)))
  const titleSize = $derived(Math.max(10.5, Math.round(18 * scale)))
  const descSize = $derived(Math.max(9, 13 * scale))
  const metaSize = $derived(Math.max(8, 11 * scale))
  const descLines = $derived(h < 110 ? 1 : h < 160 ? 2 : 3)
  const titleLines = $derived(h < 110 ? 1 : 2)
  const banner = $derived((entry.data as Record<string, unknown> | undefined)?.banner as string | undefined)
</script>

<a
  bind:this={hostEl}
  class="np-rm-node np-rm-node-{side} np-rm-node-{entry.kind} np-rm-node-{entry.status}"
  href={entry.href}
  id={entry.slug}
  style:left={`${x}px`}
  style:top={`${y}px`}
  style:width={`${w}px`}
  style:height={`${h}px`}
  style:padding={`${padY}px ${padX}px`}
  onclick={(e) => onClick(e)}
  onmouseenter={onEnter}
  onmouseleave={onLeave}
  onfocus={onEnter}
  onblur={onLeave}
>
  <RoadmapBlob
    seed={entry.slug}
    {banner}
    stroke={statusStroke(entry.status)}
    strokeWidth={entry.status === 'planned' ? 1.5 : 2.4}
  />
  <div class="np-rm-node-inner">
    <header class="np-rm-node-head" style:font-size={`${metaSize}px`}>
      <span class="np-rm-node-kind">{kindLabel(entry.kind)}</span>
      <span class="np-rm-node-meta">
        {#if entry.targetDate}
          <span class="np-rm-node-date">{formatDate(entry.targetDate)}</span>
        {/if}
      </span>
    </header>
    <span
      class="np-rm-node-title"
      style:font-size={`${titleSize}px`}
      style:-webkit-line-clamp={titleLines}
    >{entry.title}</span>
    {#if entry.description}
      <span
        class="np-rm-node-desc"
        style:font-size={`${descSize}px`}
        style:-webkit-line-clamp={descLines}
      >{entry.description}</span>
    {/if}
  </div>
</a>

<style>
  .np-rm-node {
    position: absolute;
    box-sizing: border-box;
    text-decoration: none;
    color: var(--np-text-primary);
    cursor: pointer;
    transition: transform 0.18s ease, filter 0.18s ease;
    z-index: 2;
  }
  .np-rm-node:hover { transform: translateY(-2px); filter: brightness(1.04); }
  .np-rm-node:focus-visible { outline: 2px solid var(--np-brand); outline-offset: 4px; border-radius: var(--np-radius-lg); }
  .np-rm-node-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
    text-align: left;
    gap: 4px;
    height: 100%;
    overflow: hidden;
  }
  .np-rm-node-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  .np-rm-node-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .np-rm-node-kind {
    display: inline-flex;
    align-items: center;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    line-height: 1;
    padding: 3px 9px;
    border-radius: var(--np-radius-pill);
    color: #ffffff;
    background-color: var(--np-brand);
  }
  .np-rm-node-epic .np-rm-node-kind { background-color: var(--np-info); }
  .np-rm-node-feature .np-rm-node-kind { background-color: var(--np-check); }
  .np-rm-node-bug .np-rm-node-kind { background-color: var(--np-danger); }
  .np-rm-node-date {
    font-family: var(--np-font-mono);
    color: var(--np-text-muted);
    letter-spacing: 0.04em;
  }
  .np-rm-node-title {
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.01em;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .np-rm-node-desc {
    line-height: 1.45;
    color: var(--np-text-secondary);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
