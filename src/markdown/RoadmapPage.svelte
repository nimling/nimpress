<script lang="ts">
  import { onMount, tick, mount, unmount } from 'svelte'
  import type { PageModule, RoadmapEntry, RoadmapKind } from '../types'
  import { configStore } from '../framework/configStore'
  import { setupHashSpy } from '../framework/hashSpy'
  import { navigate } from '../router'
  import BackToTop from '../layout/BackToTop.svelte'
  import RoadmapBlob from './RoadmapBlob.svelte'
  import PlanetFooter from './PlanetFooter.svelte'
  import MermaidBlock from './MermaidBlock.svelte'
  import CodeBlock from './CodeBlock.svelte'
  import CodeGroup from './CodeGroup.svelte'

  let { page }: { page: PageModule } = $props()

  const entries = $derived<RoadmapEntry[]>(page.roadmapEntries ?? [])
  const config = $derived($configStore)
  const effectiveFooter = $derived(page.frontmatter.footer ?? config.footer)
  const background = $derived(page.frontmatter.background)
  const renderBackground = $derived(!!background)

  let container: HTMLElement
  let track: HTMLElement
  let hoverHref = $state<string | null>(null)
  let hoverSide = $state<'left' | 'right'>('right')
  let mounts: Array<{ destroy: () => void }> = []
  let trackHeight = $state(0)
  let trackWidth = $state(0)
  let rocketTop = $state(0)
  let now = $state(new Date().toISOString())

  const arranged = $derived(arrangeEntries(entries))
  const dateBounds = $derived(computeBounds(arranged))
  const todayPos = $derived(positionFor(now, dateBounds, arranged))
  const changelogMarkers = $derived(collectChangelogMarkers(arranged, dateBounds))
  const spinePath = $derived(buildSpinePath(arranged, trackHeight, trackWidth))
  const activeHover = $derived(arranged.find((a) => a.entry.href === hoverHref)?.entry ?? null)

  interface Arranged {
    entry: RoadmapEntry
    side: 'left' | 'right'
    row: number
  }

  function arrangeEntries(list: RoadmapEntry[]): Arranged[] {
    const sorted = [...list].sort((a, b) => (b.targetDate ?? '').localeCompare(a.targetDate ?? ''))
    const byHref = new Map(sorted.map((e) => [e.href, e]))
    const result: Arranged[] = []
    const placedHrefs = new Set<string>()
    let row = 0
    let alternate: 'left' | 'right' = 'left'
    const childrenOf = new Map<string, RoadmapEntry[]>()
    for (const e of sorted) {
      if (e.parent && byHref.has(e.parent)) {
        const list = childrenOf.get(e.parent) ?? []
        list.push(e)
        childrenOf.set(e.parent, list)
      }
    }
    for (const e of sorted) {
      if (placedHrefs.has(e.href)) continue
      if (e.parent && byHref.has(e.parent)) continue
      const side = alternate
      result.push({ entry: e, side, row })
      placedHrefs.add(e.href)
      const kids = childrenOf.get(e.href) ?? []
      for (const child of kids) {
        if (placedHrefs.has(child.href)) continue
        row += 1
        const childSide: 'left' | 'right' = side === 'left' ? 'right' : 'left'
        result.push({ entry: child, side: childSide, row })
        placedHrefs.add(child.href)
      }
      row += 1
      alternate = alternate === 'left' ? 'right' : 'left'
    }
    for (const e of sorted) {
      if (placedHrefs.has(e.href)) continue
      result.push({ entry: e, side: alternate, row })
      placedHrefs.add(e.href)
      row += 1
      alternate = alternate === 'left' ? 'right' : 'left'
    }
    return result
  }

  function computeBounds(list: Arranged[]): { start: number; end: number } {
    const times = list
      .map((a) => a.entry.targetDate)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d).getTime())
      .filter((t) => Number.isFinite(t))
    const nowMs = new Date(now).getTime()
    if (times.length === 0) return { start: nowMs - 86400000 * 30, end: nowMs + 86400000 * 30 }
    let start = Math.min(...times)
    let end = Math.max(...times)
    if (nowMs < start) start = nowMs
    if (nowMs > end) end = nowMs
    if (start === end) end = start + 86400000
    return { start, end }
  }

  function positionFor(iso: string, bounds: { start: number; end: number }, list: Arranged[]): number {
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t) || list.length === 0) return 0
    const total = list.length
    const span = bounds.end - bounds.start
    if (span <= 0) return total / 2
    const ratio = Math.max(0, Math.min(1, (t - bounds.start) / span))
    return (1 - ratio) * total
  }

  function spineAmp(w: number): number {
    return Math.min(50, w * 0.05)
  }

  const spineGutter = 200

  function cardEdgeX(side: 'left' | 'right', w: number): number {
    const cx = w / 2
    return side === 'left' ? cx - spineGutter / 2 : cx + spineGutter / 2
  }

  function rowYPx(row: number, total: number, h: number): number {
    if (total <= 0) return 0
    return ((row + 0.5) / total) * h
  }

  function segmentCycles(list: Arranged[]): number[] {
    const N = list.length
    if (N < 2) return []
    const dates = list.map((a) => (a.entry.targetDate ? new Date(a.entry.targetDate).getTime() : 0))
    const gaps: number[] = []
    for (let i = 0; i < N - 1; i++) gaps.push(Math.abs(dates[i] - dates[i + 1]) || 1)
    const total = gaps.reduce((s, g) => s + g, 0) || 1
    const avg = total / gaps.length
    return gaps.map((g) => Math.max(0.5, Math.min(3.5, (g / avg) * 0.9 + 0.3)))
  }

  function spinePhaseAt(y: number, list: Arranged[], h: number): { phase: number; t: number; segIdx: number } {
    const N = list.length
    if (N === 0 || h <= 0) return { phase: 0, t: 0, segIdx: -1 }
    const cycles = segmentCycles(list)
    let phase = 0
    const firstRowY = rowYPx(0, N, h)
    if (y <= firstRowY) {
      const t = firstRowY > 0 ? y / firstRowY : 0
      return { phase: phase + 0.5 * 2 * Math.PI * t, t, segIdx: -1 }
    }
    phase += 0.5 * 2 * Math.PI
    for (let i = 0; i < N - 1; i++) {
      const yStart = rowYPx(i, N, h)
      const yEnd = rowYPx(i + 1, N, h)
      if (y <= yEnd) {
        const t = (y - yStart) / Math.max(1e-9, yEnd - yStart)
        return { phase: phase + cycles[i] * 2 * Math.PI * t, t, segIdx: i }
      }
      phase += cycles[i] * 2 * Math.PI
    }
    const lastRowY = rowYPx(N - 1, N, h)
    const t = (y - lastRowY) / Math.max(1e-9, h - lastRowY)
    return { phase: phase + 0.5 * 2 * Math.PI * t, t, segIdx: N - 1 }
  }

  function buildSpinePath(list: Arranged[], h: number, w: number): string {
    const N = list.length
    if (N === 0 || h <= 0 || w <= 0) return ''
    const cx = w / 2
    const amp = spineAmp(w)
    const cycles = segmentCycles(list)
    let d = `M ${cx.toFixed(2)} 0 `
    let phase = 0
    const firstRowY = rowYPx(0, N, h)
    const preSamples = 16
    for (let j = 1; j <= preSamples; j++) {
      const t = j / preSamples
      const y = firstRowY * t
      const lp = phase + 0.5 * 2 * Math.PI * t
      const x = cx + Math.sin(lp) * amp
      d += `L ${x.toFixed(2)} ${y.toFixed(2)} `
    }
    phase += 0.5 * 2 * Math.PI
    for (let i = 0; i < N - 1; i++) {
      const yStart = rowYPx(i, N, h)
      const yEnd = rowYPx(i + 1, N, h)
      const segC = cycles[i]
      const samples = Math.max(16, Math.ceil(segC * 18))
      for (let j = 1; j <= samples; j++) {
        const t = j / samples
        const y = yStart + (yEnd - yStart) * t
        const lp = phase + segC * 2 * Math.PI * t
        const x = cx + Math.sin(lp) * amp
        d += `L ${x.toFixed(2)} ${y.toFixed(2)} `
      }
      phase += segC * 2 * Math.PI
    }
    const lastRowY = rowYPx(N - 1, N, h)
    const postSamples = 16
    for (let j = 1; j <= postSamples; j++) {
      const t = j / postSamples
      const y = lastRowY + (h - lastRowY) * t
      const lp = phase + 0.5 * 2 * Math.PI * t
      const x = cx + Math.sin(lp) * amp
      d += `L ${x.toFixed(2)} ${y.toFixed(2)} `
    }
    return d
  }

  function spineXAt(y: number, list: Arranged[], h: number, w: number): number {
    if (h <= 0 || w <= 0 || list.length === 0) return w / 2
    const cx = w / 2
    const amp = spineAmp(w)
    const { phase } = spinePhaseAt(y, list, h)
    return cx + Math.sin(phase) * amp
  }

  function spineTangentAt(y: number, list: Arranged[], h: number, w: number): number {
    if (h <= 0 || w <= 0 || list.length === 0) return 0
    const eps = Math.max(1, h / 200)
    const y1 = Math.max(0, y - eps)
    const y2 = Math.min(h, y + eps)
    const x1 = spineXAt(y1, list, h, w)
    const x2 = spineXAt(y2, list, h, w)
    const dx = x2 - x1
    const dy = y2 - y1
    if (dy === 0) return 0
    return Math.atan2(dx, dy)
  }

  function collectChangelogMarkers(
    list: Arranged[],
    bounds: { start: number; end: number }
  ): { date: string; version: string; href: string; row: number }[] {
    const out: { date: string; version: string; href: string; row: number }[] = []
    for (const a of list) {
      for (const ref of a.entry.changelog) {
        if (!ref.releaseDate) continue
        out.push({
          date: ref.releaseDate,
          version: ref.version,
          href: `${ref.path}#${ref.slug}`,
          row: positionFor(ref.releaseDate, bounds, list)
        })
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date))
  }

  function kindLabel(kind: RoadmapKind): string {
    return kind.toUpperCase()
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

  function onCardEnter(entry: RoadmapEntry, side: 'left' | 'right', ev: Event) {
    hoverHref = entry.href
    hoverSide = side === 'left' ? 'right' : 'left'
    const el = ev.currentTarget as HTMLElement | null
    if (el) positionAside(el, side)
  }

  function onCardLeave() {
    hoverHref = null
  }

  let asideTop = $state(0)
  let asideLeft = $state(0)

  function positionAside(cardEl: HTMLElement, cardSide: 'left' | 'right') {
    const rect = cardEl.getBoundingClientRect()
    const margin = 16
    const asideWidth = Math.min(380, window.innerWidth * 0.32)
    const asideHeightEstimate = 320
    let left: number
    if (cardSide === 'left') {
      left = rect.right + margin
      if (left + asideWidth + margin > window.innerWidth) left = rect.left - asideWidth - margin
    } else {
      left = rect.left - asideWidth - margin
      if (left < margin) left = rect.right + margin
    }
    left = Math.max(margin, Math.min(window.innerWidth - asideWidth - margin, left))
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--np-header-height')) || 0
    let top = rect.top
    top = Math.max(headerH + margin, Math.min(window.innerHeight - asideHeightEstimate - margin, top))
    asideTop = top
    asideLeft = left
  }

  function gotoEntry(entry: RoadmapEntry, e: MouseEvent) {
    if (window.matchMedia('(max-width: 900px)').matches) {
      if (hoverHref !== entry.href) {
        e.preventDefault()
        hoverHref = entry.href
        return
      }
    }
    e.preventDefault()
    navigate(entry.href)
  }

  function measure() {
    if (!track) return
    trackHeight = track.offsetHeight
    trackWidth = track.offsetWidth
    if (arranged.length === 0) {
      rocketTop = 0
      return
    }
    const ratio = todayPos / arranged.length
    rocketTop = Math.max(0, Math.min(trackHeight, ratio * trackHeight))
  }

  function markerSide(row: number, list: Arranged[], w: number): 'left' | 'right' {
    if (list.length === 0 || trackHeight <= 0) return 'right'
    const y = (row / list.length) * trackHeight
    const x = spineXAt(y, list, trackHeight, w)
    return x >= w / 2 ? 'left' : 'right'
  }

  function oppositeOfNearest(targetRow: number, list: Arranged[]): 'left' | 'right' {
    if (list.length === 0) return 'left'
    let best = list[0]
    for (const a of list) {
      if (Math.abs(a.row - targetRow) < Math.abs(best.row - targetRow)) best = a
    }
    return best.side === 'left' ? 'right' : 'left'
  }

  let travelFrame = 0
  function travel() {
    if (!arranged.length || trackHeight <= 0 || !track) return
    cancelAnimationFrame(travelFrame)
    const target = (todayPos / arranged.length) * trackHeight
    const startRocket = trackHeight
    const duration = 4200
    const trackTop = track.offsetTop
    rocketTop = startRocket
    const initialScrollY = Math.max(0, trackTop + startRocket - window.innerHeight * 0.55)
    window.scrollTo({ top: initialScrollY, behavior: 'smooth' })
    setTimeout(() => {
      const t0 = performance.now()
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        rocketTop = startRocket - (startRocket - target) * eased
        const rocketPageY = trackTop + rocketTop
        const desired = window.innerHeight * 0.55
        const currentRocketScreenY = rocketPageY - window.scrollY
        const delta = currentRocketScreenY - desired
        if (Math.abs(delta) > 1) window.scrollTo(0, Math.max(0, window.scrollY + delta))
        if (p < 1) travelFrame = requestAnimationFrame(step)
      }
      travelFrame = requestAnimationFrame(step)
    }, 600)
  }

  async function hydrate() {
    for (const m of mounts) m.destroy()
    mounts = []
    await tick()
    if (!container) return
    const mermaids = container.querySelectorAll<HTMLDivElement>('.np-mermaid[data-graph]')
    for (const el of Array.from(mermaids)) {
      const raw = el.dataset.graph ?? ''
      let graph = ''
      try {
        graph = decodeURIComponent(escape(atob(raw)))
      } catch {}
      const host = document.createElement('div')
      el.replaceWith(host)
      const instance = mount(MermaidBlock, { target: host, props: { source: graph } })
      mounts.push({ destroy: () => unmount(instance) })
    }
    const groups = container.querySelectorAll<HTMLElement>('.np-code-group')
    for (const group of Array.from(groups)) {
      if (group.parentElement?.classList.contains('np-code-mount')) continue
      const pres = Array.from(group.querySelectorAll<HTMLElement>('pre'))
      if (pres.length === 0) continue
      const tabs = pres.map((pre) => ({
        lang: pre.getAttribute('data-lang') ?? '',
        html: pre.outerHTML,
        raw: pre.querySelector('code')?.innerText ?? ''
      }))
      const host = document.createElement('div')
      host.className = 'np-code-mount'
      group.replaceWith(host)
      const instance = mount(CodeGroup, { target: host, props: { tabs } })
      mounts.push({ destroy: () => unmount(instance) })
    }
    const pres = container.querySelectorAll<HTMLElement>('pre')
    for (const pre of Array.from(pres)) {
      if (pre.closest('.np-code-mount')) continue
      if (!pre.classList.contains('shiki') && !pre.hasAttribute('data-lang')) continue
      const lang = pre.getAttribute('data-lang') ?? ''
      const code = pre.querySelector('code')?.innerText ?? ''
      const host = document.createElement('div')
      host.className = 'np-code-mount'
      pre.replaceWith(host)
      const instance = mount(CodeBlock, { target: host, props: { html: pre.outerHTML, lang, raw: code } })
      mounts.push({ destroy: () => unmount(instance) })
    }
  }

  onMount(() => {
    void hydrate()
    let ro: ResizeObserver | null = null
    requestAnimationFrame(() => {
      measure()
      requestAnimationFrame(() => {
        const scrollY = rocketTop + (track?.offsetTop ?? 0) - window.innerHeight / 2
        window.scrollTo({ top: Math.max(0, scrollY), behavior: 'auto' })
      })
    })
    if (typeof ResizeObserver !== 'undefined' && track) {
      ro = new ResizeObserver(() => measure())
      ro.observe(track)
    }
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    const stopSpy = setupHashSpy({ root: container, selector: '.np-roadmap-row[id]' })
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', onResize)
      stopSpy()
      for (const m of mounts) m.destroy()
    }
  })

  $effect(() => {
    page.slug
    void hydrate()
  })
</script>

{#if renderBackground}
  <div class="np-page-background" style:background-image={`url('${background}')`}></div>
{/if}
<div class="np-page-shell">
  <div class="np-page">
    <section class="np-roadmap-hero">
      <div class="np-roadmap-hero-copy" bind:this={container}>
        <p class="np-roadmap-eyebrow">Roadmap</p>
        <h1 class="np-roadmap-hero-title">{page.frontmatter.title}</h1>
        {#if page.frontmatter.description}
          <p class="np-roadmap-hero-tagline">{page.frontmatter.description}</p>
        {/if}
        {#if page.html}
          <div class="np-roadmap-hero-body np-prose">{@html page.html}</div>
        {/if}
      </div>
      <button class="np-roadmap-travel" type="button" onclick={travel}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 2 L 14 8 L 4 14 Z" fill="currentColor" />
        </svg>
        <span>Travel</span>
      </button>
    </section>

    <div class="np-roadmap-track" bind:this={track}>
      <svg class="np-roadmap-spine-svg" viewBox={`0 0 ${trackWidth} ${trackHeight}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <clipPath id="np-roadmap-trail-clip" clipPathUnits="userSpaceOnUse">
            <rect x="0" y={rocketTop} width={trackWidth} height={Math.max(0, trackHeight - rocketTop)} />
          </clipPath>
        </defs>
        <path d={spinePath} class="np-roadmap-spine-path" />
        <path d={spinePath} class="np-roadmap-spine-trail" clip-path="url(#np-roadmap-trail-clip)" />
        {#each arranged as a (a.entry.href)}
          {@const rowY = rowYPx(a.row, arranged.length, trackHeight)}
          {@const sX = spineXAt(rowY, arranged, trackHeight, trackWidth)}
          {@const eX = cardEdgeX(a.side, trackWidth)}
          <line
            class="np-roadmap-row-connector"
            x1={sX}
            y1={rowY}
            x2={eX}
            y2={rowY}
          />
          <circle class="np-roadmap-row-dot" cx={sX} cy={rowY} r="4" />
        {/each}
      </svg>

      {#each changelogMarkers as marker (marker.href + marker.date)}
        {@const top = (marker.row / Math.max(1, arranged.length)) * trackHeight}
        {@const x = spineXAt(top, arranged, trackHeight, trackWidth)}
        {@const side = markerSide(marker.row, arranged, trackWidth)}
        <a
          class="np-roadmap-marker np-roadmap-marker-{side}"
          style:top={`${top}px`}
          style:left={`${x}px`}
          href={marker.href}
          title={`Changelog v${marker.version} on ${formatDate(marker.date)}`}
          aria-label={`Changelog v${marker.version} ${formatDate(marker.date)}`}
        >
          <span class="np-roadmap-marker-line" aria-hidden="true"></span>
          <span class="np-roadmap-marker-label">v{marker.version} · {formatDate(marker.date)}</span>
        </a>
      {/each}

      {#if arranged.length > 0}
        {@const todayTop = (todayPos / Math.max(1, arranged.length)) * trackHeight}
        {@const todayX = spineXAt(todayTop, arranged, trackHeight, trackWidth)}
        {@const todaySide = oppositeOfNearest(todayPos, arranged)}
        <div
          class="np-roadmap-today np-roadmap-today-{todaySide}"
          style:top={`${todayTop}px`}
          style:left={`${todayX}px`}
          aria-hidden="true"
        >
          <span class="np-roadmap-today-line"></span>
          <span class="np-roadmap-today-label">{formatDate(now)}</span>
        </div>
        {@const rocketX = spineXAt(rocketTop, arranged, trackHeight, trackWidth)}
        {@const rocketAngle = spineTangentAt(rocketTop, arranged, trackHeight, trackWidth)}
        <div class="np-roadmap-rocket" style:top={`${rocketTop}px`} style:left={`${rocketX}px`} style:transform={`translate(-50%, -50%) rotate(${(rocketAngle * 180) / Math.PI}deg)`} aria-hidden="true">
          <svg viewBox="0 0 32 48" width="32" height="48">
            <defs>
              <linearGradient id="np-rocket-body" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--np-brand)" />
                <stop offset="100%" stop-color="var(--np-brand-hover, var(--np-brand))" />
              </linearGradient>
              <linearGradient id="np-rocket-flame" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--np-brand)" stop-opacity="0.9" />
                <stop offset="100%" stop-color="var(--np-danger, #ff6b6b)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path d="M16 2 C 22 8, 24 18, 24 26 L 24 34 L 8 34 L 8 26 C 8 18, 10 8, 16 2 Z" fill="url(#np-rocket-body)" stroke="var(--np-text-primary)" stroke-width="1" />
            <circle cx="16" cy="16" r="3.5" fill="var(--np-bg-card)" stroke="var(--np-text-primary)" stroke-width="1" />
            <path d="M8 28 L 2 38 L 8 34 Z" fill="var(--np-brand)" />
            <path d="M24 28 L 30 38 L 24 34 Z" fill="var(--np-brand)" />
            <path d="M12 34 L 16 46 L 20 34 Z" fill="url(#np-rocket-flame)" />
          </svg>
        </div>
      {/if}

      <div class="np-roadmap-rows">
        {#each arranged as a, idx (a.entry.href)}
          <div
            class="np-roadmap-row np-roadmap-row-{a.side} np-roadmap-row-{a.entry.kind} np-roadmap-row-{a.entry.status}"
            id={a.entry.slug}
            style:order={a.row}
          >
            <a
              class="np-roadmap-card"
              href={a.entry.href}
              onclick={(e) => gotoEntry(a.entry, e)}
              onmouseenter={(e) => onCardEnter(a.entry, a.side, e)}
              onmouseleave={onCardLeave}
              onfocus={(e) => onCardEnter(a.entry, a.side, e)}
              onblur={onCardLeave}
            >
              <RoadmapBlob seed={a.entry.slug + ':' + idx} />
              <div class="np-roadmap-card-inner">
                <header class="np-roadmap-card-head">
                  <span class="np-roadmap-card-kind">{kindLabel(a.entry.kind)}</span>
                  {#if a.entry.targetDate}
                    <span class="np-roadmap-card-date">{formatDate(a.entry.targetDate)}</span>
                  {/if}
                </header>
                <span class="np-roadmap-card-title">{a.entry.title}</span>
                {#if a.entry.description}
                  <span class="np-roadmap-card-desc">{a.entry.description}</span>
                {/if}
                {#if a.entry.status === 'shipped' || a.entry.status === 'in_progress'}
                  <span class="np-roadmap-card-status" data-status={a.entry.status}>
                    {a.entry.status === 'shipped' ? 'Shipped' : 'In progress'}
                  </span>
                {/if}
              </div>
            </a>
          </div>
        {/each}
        {#if arranged.length === 0}
          <p class="np-roadmap-empty">No items.</p>
        {/if}
      </div>
    </div>
    <PlanetFooter footer={effectiveFooter ?? ''} />
  </div>
</div>

{#if activeHover}
  <aside class="np-roadmap-aside" style:top={`${asideTop}px`} style:left={`${asideLeft}px`}>
    <header class="np-roadmap-aside-head">
      <span class="np-roadmap-card-kind">{kindLabel(activeHover.kind)}</span>
      <h2>{activeHover.title}</h2>
      {#if activeHover.targetDate}
        <span class="np-roadmap-aside-date">{formatDate(activeHover.targetDate)}</span>
      {/if}
    </header>
    {#if activeHover.description}
      <p class="np-roadmap-aside-desc">{activeHover.description}</p>
    {/if}
    {#if activeHover.html}
      <div class="np-roadmap-aside-body">{@html activeHover.html}</div>
    {/if}
    {#if activeHover.changelog.length}
      <ul class="np-roadmap-aside-changelog">
        {#each activeHover.changelog as ref (ref.entrySlug)}
          <li>
            <a href={ref.entrySlug}>
              <span class="np-roadmap-aside-version">v{ref.version}</span>
              <span class="np-roadmap-aside-ref-title">{ref.title}</span>
              {#if ref.releaseDate}
                <span class="np-roadmap-aside-ref-date">{formatDate(ref.releaseDate)}</span>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </aside>
{/if}

<BackToTop />

<style>
  .np-page-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    justify-content: center;
    width: 100%;
  }
  .np-page {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 32px;
    box-sizing: border-box;
  }

  .np-roadmap-hero {
    position: relative;
    width: 100%;
    margin: 0 auto;
    padding: 40px 0 32px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 32px;
  }
  .np-roadmap-hero-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    max-width: 760px;
    min-width: 0;
    flex: 1;
  }
  .np-roadmap-travel {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: var(--np-radius-pill);
    border: 1px solid color-mix(in srgb, var(--np-brand) 50%, transparent);
    background-color: color-mix(in srgb, var(--np-brand) 10%, transparent);
    color: var(--np-brand);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
    margin-top: 8px;
  }
  .np-roadmap-travel:hover {
    background-color: color-mix(in srgb, var(--np-brand) 18%, transparent);
    border-color: var(--np-brand);
    transform: translateY(-1px);
  }
  .np-roadmap-travel:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 3px;
  }
  .np-roadmap-travel svg { display: block; }
  .np-roadmap-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 12px;
    color: var(--np-brand);
    font-weight: 700;
    margin: 0 0 16px;
  }
  .np-roadmap-hero-title {
    font-size: 56px;
    line-height: 1.05;
    font-weight: 800;
    letter-spacing: -0.025em;
    margin: 0 0 20px;
    color: var(--np-brand);
  }
  @media (min-width: 960px) {
    .np-roadmap-hero-title { font-size: 72px; }
  }
  .np-roadmap-hero-tagline {
    font-size: 22px;
    line-height: 1.4;
    color: var(--np-text-primary);
    margin: 0 0 16px;
    font-weight: 500;
    max-width: 60ch;
  }
  .np-roadmap-hero-body {
    font-size: 16px;
    line-height: 1.65;
    color: var(--np-text-secondary);
    margin: 8px 0 0;
    max-width: 60ch;
  }
  .np-roadmap-hero-body :global(p) {
    margin: 0 0 12px;
  }

  .np-roadmap-track {
    position: relative;
    padding: 32px 0 80px;
    margin: 0 auto;
    max-width: 1100px;
    min-height: 600px;
  }
  .np-roadmap-spine-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .np-roadmap-spine-path {
    fill: none;
    stroke: var(--np-text-muted);
    stroke-width: 2;
    stroke-dasharray: 6 8;
    opacity: 0.9;
  }
  .np-roadmap-spine-trail {
    fill: none;
    stroke: var(--np-brand);
    stroke-width: 2.5;
    stroke-linecap: round;
    opacity: 0.85;
    transition: clip-path 0.3s ease;
  }

  .np-roadmap-rows {
    display: flex;
    flex-direction: column;
    gap: 40px;
    position: relative;
  }
  .np-roadmap-row {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 200px minmax(0, 1fr);
    align-items: center;
    gap: 0;
  }
  .np-roadmap-row-left > a { grid-column: 1; justify-self: end; }
  .np-roadmap-row-right > a { grid-column: 3; justify-self: start; }

  .np-roadmap-row-connector {
    stroke: var(--np-text-muted);
    stroke-width: 1.4;
    stroke-dasharray: 2 5;
    stroke-linecap: round;
    opacity: 0.95;
  }
  .np-roadmap-row-dot {
    fill: var(--np-bg);
    stroke: var(--np-text-muted);
    stroke-width: 2;
  }

  .np-roadmap-card {
    position: relative;
    display: block;
    width: 100%;
    max-width: 420px;
    padding: 44px 52px;
    text-decoration: none;
    color: var(--np-text-primary);
    cursor: pointer;
    transition: transform 0.18s ease, filter 0.18s ease;
  }
  .np-roadmap-card:hover { transform: translateY(-2px); filter: brightness(1.04); }
  .np-roadmap-card:focus-visible { outline: 2px solid var(--np-brand); outline-offset: 4px; border-radius: var(--np-radius-lg); }
  .np-roadmap-card-inner {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .np-roadmap-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .np-roadmap-card-kind {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--np-brand);
  }
  .np-roadmap-row-epic .np-roadmap-card-kind { color: var(--np-info, var(--np-brand)); }
  .np-roadmap-row-feature .np-roadmap-card-kind { color: var(--np-check, var(--np-brand)); }
  .np-roadmap-row-bug .np-roadmap-card-kind { color: var(--np-danger); }
  .np-roadmap-card-date {
    font-family: var(--np-font-mono);
    font-size: 12px;
    color: var(--np-text-muted);
    letter-spacing: 0.04em;
  }
  .np-roadmap-card-title {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }
  .np-roadmap-card-desc {
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--np-text-secondary);
  }
  .np-roadmap-card-status {
    align-self: flex-start;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: var(--np-text-muted);
    padding: 2px 10px;
    border-radius: var(--np-radius-pill);
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
    margin-top: 4px;
  }
  .np-roadmap-card-status[data-status='shipped'] {
    color: var(--np-check, var(--np-brand));
    border-color: var(--np-check, var(--np-brand));
    background-color: color-mix(in srgb, var(--np-check, var(--np-brand)) 14%, transparent);
  }
  .np-roadmap-card-status[data-status='in_progress'] {
    color: var(--np-brand);
    border-color: var(--np-brand);
    background-color: color-mix(in srgb, var(--np-brand) 14%, transparent);
  }

  .np-roadmap-today {
    position: absolute;
    transform: translate(-50%, -50%);
    height: 0;
    display: flex;
    align-items: center;
    pointer-events: none;
    z-index: 3;
    white-space: nowrap;
  }
  .np-roadmap-today-line {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 56px;
    height: 0;
    border-top: 1px dotted var(--np-border);
    opacity: 0.9;
  }
  .np-roadmap-today-label {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: var(--np-text-muted);
    font-family: var(--np-font-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
  }
  .np-roadmap-today-left .np-roadmap-today-label { right: calc(50% + 36px); }
  .np-roadmap-today-right .np-roadmap-today-label { left: calc(50% + 36px); }

  .np-roadmap-rocket {
    position: absolute;
    transform-origin: 50% 50%;
    z-index: 4;
    will-change: transform, top, left;
    transition: top 0.25s ease, left 0.25s ease, transform 0.25s ease;
    filter: drop-shadow(0 6px 18px color-mix(in srgb, var(--np-brand) 35%, transparent));
  }

  .np-roadmap-marker {
    position: absolute;
    transform: translate(-50%, -50%);
    height: 0;
    display: flex;
    align-items: center;
    pointer-events: auto;
    text-decoration: none;
    z-index: 2;
    white-space: nowrap;
  }
  .np-roadmap-marker-line {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 0;
    border-top: 1px dotted var(--np-border);
    opacity: 0.9;
    transition: border-color 0.15s ease, opacity 0.15s ease;
  }
  .np-roadmap-marker-label {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: var(--np-text-muted);
    font-family: var(--np-font-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    transition: color 0.15s ease;
  }
  .np-roadmap-marker-left .np-roadmap-marker-label { right: calc(50% + 28px); }
  .np-roadmap-marker-right .np-roadmap-marker-label { left: calc(50% + 28px); }
  .np-roadmap-marker:hover .np-roadmap-marker-label {
    color: var(--np-brand);
  }
  .np-roadmap-marker:hover .np-roadmap-marker-line {
    border-color: var(--np-brand);
    opacity: 1;
  }

  .np-roadmap-aside {
    position: fixed;
    width: min(380px, 32vw);
    max-height: calc(100vh - var(--np-header-height) - 48px);
    overflow-y: auto;
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    padding: 20px 22px;
    z-index: 40;
  }
  .np-roadmap-aside-head h2 {
    margin: 8px 0 4px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .np-roadmap-aside-date {
    font-family: var(--np-font-mono);
    font-size: 11px;
    color: var(--np-text-muted);
  }
  .np-roadmap-aside-desc {
    margin: 0 0 12px;
    color: var(--np-text-secondary);
    font-size: 13px;
    line-height: 1.55;
  }
  .np-roadmap-aside-body :global(p) { margin: 0 0 10px; font-size: 13px; }
  .np-roadmap-aside-changelog {
    list-style: none;
    padding: 0;
    margin: 12px 0 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .np-roadmap-aside-changelog a {
    display: flex;
    gap: 8px;
    align-items: baseline;
    text-decoration: none;
    color: inherit;
    padding: 4px 6px;
    border-radius: var(--np-radius-sm);
  }
  .np-roadmap-aside-changelog a:hover { background-color: var(--np-bg-surface); }
  .np-roadmap-aside-version { font-family: var(--np-font-mono); color: var(--np-brand); font-weight: 600; }
  .np-roadmap-aside-ref-title { flex: 1; color: var(--np-text-primary); font-size: 12px; }
  .np-roadmap-aside-ref-date { color: var(--np-text-muted); font-family: var(--np-font-mono); font-size: 11px; }

  @media (max-width: 900px) {
    .np-roadmap-hero { padding: 72px 0 32px; }
    .np-roadmap-hero-title { font-size: 38px; }
    .np-roadmap-hero-tagline { font-size: 18px; }
    .np-roadmap-track { padding: 16px 0 60px; }
    .np-roadmap-row {
      grid-template-columns: 36px 1fr;
      gap: 12px;
    }
    .np-roadmap-row-left > a,
    .np-roadmap-row-right > a {
      grid-column: 2;
      justify-self: stretch;
      max-width: none;
    }
    .np-roadmap-aside { display: none; }
  }

  .np-roadmap-empty {
    color: var(--np-text-muted);
    font-style: italic;
    text-align: center;
    padding: 32px;
  }

  .np-page-footer {
    margin-top: 96px;
    padding: 32px 0 0;
    text-align: center;
    color: var(--np-text-faint);
    font-size: 13px;
    white-space: pre-line;
  }
  .np-roadmap-planet {
    position: relative;
    margin: 0 -32px;
    padding: 0;
    width: calc(100% + 64px);
    height: 50vh;
    min-height: 320px;
    overflow: hidden;
    pointer-events: none;
  }
  .np-roadmap-planet svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .np-page-background {
    position: fixed;
    top: var(--np-header-height, 0px);
    left: 0;
    right: 0;
    height: min(520px, 80vh);
    background-size: cover;
    background-position: top center;
    background-repeat: no-repeat;
    opacity: 0.55;
    pointer-events: none;
    z-index: 0;
    mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
  }
</style>
