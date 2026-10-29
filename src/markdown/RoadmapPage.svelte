<script lang="ts">
  import { onMount, tick, mount, unmount, createRawSnippet } from 'svelte'
  import type { PageModule, RoadmapCard, RoadmapKind, RoadmapChangelogRef } from '../types'
  import { configStore } from '../framework/configStore'
  import { setupHashSpy } from '../framework/hashSpy'
  import { navigate } from 'sly-svelte-location-router'
  import { withBase } from '../framework/configStore'
  import StockBackToTop from '../layout/BackToTop.svelte'
  import RoadmapNode from './RoadmapNode.svelte'
  import PlanetFooter from './PlanetFooter.svelte'
  import StockMermaidBlock from './MermaidBlock.svelte'
  import StockD2Block from './D2Block.svelte'
  import StockMathBlock from './MathBlock.svelte'
  import StockDBMLBlock from './DBMLBlock.svelte'
  import StockCodeBlock from './CodeBlock.svelte'
  import StockCodeGroup from './CodeGroup.svelte'
  import StockTabs from './Tabs.svelte'
  import { themed } from '../framework/components'
  import {
    GRID_COLS,
    buildTree,
    flattenTree,
    toTime,
    layoutTrackNarrow,
    buildSpinePath,
    buildSpineConnectors,
    computeSpineAnchors,
    scalePath,
    type TrackLayout,
    type TreeNode,
    type RoadmapLayoutView
  } from '../roadmap/layout'

  const MermaidBlock = themed('MermaidBlock', StockMermaidBlock)
  const D2Block = themed('D2Block', StockD2Block)
  const MathBlock = themed('MathBlock', StockMathBlock)
  const DBMLBlock = themed('DBMLBlock', StockDBMLBlock)
  const BackToTop = themed('BackToTop', StockBackToTop)
  const CodeBlock = themed('CodeBlock', StockCodeBlock)
  const CodeGroup = themed('CodeGroup', StockCodeGroup)
  const Tabs = themed('Tabs', StockTabs)

  let { page }: { page: PageModule } = $props()

  const entries = $derived<RoadmapCard[]>(page.roadmapEntries ?? [])
  const config = $derived($configStore)
  const effectiveFooter = $derived(page.frontmatter.hide?.includes('footer') ? undefined : page.frontmatter.footer ?? config.footer)
  const background = $derived(page.frontmatter.background ?? '')
  const renderBackground = $derived(!!background)

  let container: HTMLElement
  let track: HTMLElement
  let spinePathEl: SVGPathElement | null = $state(null)
  let hoverHref = $state<string | null>(null)
  let rocketHover = $state(false)
  let hoverRect = $state<{ left: number; top: number; right: number; bottom: number } | null>(null)
  let popupW = $state(0)
  let popupH = $state(0)
  let asideEl: HTMLElement | null = $state(null)
  let asideOverflow = $state(false)
  let mounts: Array<{ destroy: () => void }> = []
  let trackHeight = $state(0)
  let trackWidth = $state(1100)
  let narrow = $state(false)
  let measured = $state(false)
  let mode = $state<'organic' | 'straight'>('organic')
  let totalLength = $state(0)
  let anchorLens = $state<number[]>([])
  let rocketLen = $state(0)
  let flying = $state(false)
  let now = $state(new Date().toISOString())
  const tree = $derived(buildTree(entries))
  const effectiveTrackW = $derived(trackWidth || 1100)
  let layout = $state<TrackLayout>({ rows: [], links: [], blocked: [], budgets: [], cell: 0, gridRows: 0, totalH: 0 })
  let spinePath = $state('')
  let viewAnchorLens = $state<number[] | null>(null)
  let loaderShown = $state(false)
  let ready = $state(false)

  function fromView(view: RoadmapLayoutView, width: number): TrackLayout {
    const cell = width / GRID_COLS
    const byHref = new Map(entries.map((e) => [e.href, e]))
    const rows = view.rows.flatMap((r) => {
      const boxes = r.boxes.flatMap((b) => {
        const entry = byHref.get(b.href)
        if (!entry) return []
        return [{
          entry,
          depth: b.depth,
          variant: b.variant,
          col: b.col,
          row: b.row,
          cols: b.cols,
          rows: b.rows,
          x: b.col * cell,
          y: b.row * cell,
          w: b.cols * cell,
          h: b.rows * cell,
          anchorSide: b.anchorSide,
          anchorX: b.anchorX === undefined ? undefined : b.anchorX * cell,
          anchorY: b.anchorY === undefined ? undefined : b.anchorY * cell,
          date: toTime(entry)
        }]
      })
      const root = boxes[0]
      if (!root) return []
      return [{
        rootEntry: root.entry,
        side: r.side,
        boxes,
        top: root.y,
        cellSide: root.h,
        issueCellX: root.x,
        pathCellX: 0,
        pathCenterX: root.anchorX ?? 0,
        rowMid: root.anchorY ?? 0,
        gapAfter: 0,
        spineAnchorX: root.anchorX ?? 0,
        spineAnchorY: root.anchorY ?? 0
      }]
    })
    return {
      rows,
      links: view.links.map((l) => ({ id: l.id, d: scalePath(l.d, cell) })),
      blocked: [],
      budgets: [],
      cell,
      gridRows: view.gridRows,
      totalH: view.gridRows * cell
    }
  }

  $effect(() => {
    const roots = tree
    const width = effectiveTrackW
    const isNarrow = narrow
    const view = page.roadmapLayout?.[mode]
    if (!measured) return
    const reveal = setTimeout(() => (loaderShown = true), 120)
    let frame = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    frame = requestAnimationFrame(() => {
      timer = setTimeout(() => {
        if (isNarrow || !view) {
          layout = layoutTrackNarrow(roots, width)
          spinePath = buildSpinePath(layout, width, layout.totalH, true)
          viewAnchorLens = null
        } else {
          layout = fromView(view, width)
          spinePath = scalePath(view.spine, layout.cell)
          viewAnchorLens = view.anchorLens.map((l) => l * layout.cell)
        }
        loaderShown = false
        clearTimeout(reveal)
        if (flipFrom) {
          const from = flipFrom
          flipFrom = null
          tick().then(() => playFlip(from))
        }
      }, 0)
    })
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      clearTimeout(reveal)
    }
  })
  const spineConnectors = $derived(buildSpineConnectors(layout.rows, effectiveTrackW))
  const dateBounds = $derived(computeBounds(entries))
  const changelogMarkers = $derived(collectChangelogMarkers(tree))
  const activeHover = $derived(findActiveHover(tree, hoverHref))
  const rocketPoint = $derived(pointAtLen(rocketLen))
  const todayPoint = $derived(pointAtLen(lenForDate(now)))
  const rocketShown = $derived(totalLength > 0 && !!spinePathEl && entries.length > 0)
  const trailDashoffset = $derived(Math.max(0, totalLength - rocketLen))
  const spineTopPoint = $derived.by(() => {
    const anchors = computeSpineAnchors(layout.rows, effectiveTrackW)
    if (!anchors.length) return null
    const n = anchors[anchors.length - 1]
    return { x: n.x, y: Math.max(40, n.y - 92) - 26 }
  })
  const todayMarker = $derived.by(() => {
    const tp = todayPoint
    let near: { x: number; y: number } | null = null
    let bd = Infinity
    for (const a of computeSpineAnchors(layout.rows, effectiveTrackW)) {
      const d = (a.x - tp.x) ** 2 + (a.y - tp.y) ** 2
      if (d < bd) {
        bd = d
        near = a
      }
    }
    let nx = -Math.sin(tp.angle)
    let ny = Math.cos(tp.angle)
    if (near && nx * (tp.x - near.x) + ny * (tp.y - near.y) < 0) {
      nx = -nx
      ny = -ny
    }
    const TICK = 30
    const GAP = 10
    return {
      x: tp.x,
      y: tp.y,
      deg: (Math.atan2(ny, nx) * 180) / Math.PI,
      labelX: nx * (TICK + GAP),
      labelY: ny * (TICK + GAP)
    }
  })
  const roadmapChangelog = $derived.by(() => {
    const seen = new Set<string>()
    const out: RoadmapChangelogRef[] = []
    for (const n of flattenTree(tree)) {
      for (const ref of n.entry.changelog) {
        if (seen.has(ref.entrySlug)) continue
        seen.add(ref.entrySlug)
        out.push(ref)
      }
    }
    return out.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
  })
  const changelogHref = $derived(roadmapChangelog[0]?.path ?? null)
  const modalView = $derived.by(() => {
    if (activeHover) {
      return {
        kind: activeHover.kind as RoadmapKind | null,
        title: activeHover.title,
        date: activeHover.targetDate,
        description: activeHover.description,
        html: activeHover.html,
        changelog: activeHover.changelog
      }
    }
    if (rocketHover && roadmapChangelog.length) {
      return {
        kind: null,
        title: 'Changelog',
        date: now,
        description: 'Releases shipped on this roadmap.',
        html: '',
        changelog: roadmapChangelog
      }
    }
    return null
  })

  const popupPos = $derived.by(() => {
    if (!modalView || !hoverRect || popupW === 0 || popupH === 0) return null
    return placeNearAnchor(hoverRect, popupW, popupH, true)
  })

  function lenForDate(iso: string): number {
    if (!spinePathEl || totalLength === 0 || anchorLens.length === 0) return 0
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t)) return 0
    const anchors = computeSpineAnchors(layout.rows, effectiveTrackW)
    const lerp = (t0: number, t1: number, l0: number, l1: number) => (t1 <= t0 ? l1 : l0 + (l1 - l0) * Math.max(0, Math.min(1, (t - t0) / (t1 - t0))))
    if (t <= anchors[0].date) return lerp(dateBounds.start, anchors[0].date, 0, anchorLens[0])
    for (let i = 0; i < anchors.length - 1; i++) {
      if (t <= anchors[i + 1].date) return lerp(anchors[i].date, anchors[i + 1].date, anchorLens[i], anchorLens[i + 1])
    }
    const last = anchors.length - 1
    return lerp(anchors[last].date, dateBounds.end, anchorLens[last], totalLength)
  }

  function pointAtLen(len: number): { x: number; y: number; angle: number } {
    if (!spinePathEl || totalLength === 0) return { x: (trackWidth || 1100) / 2, y: 0, angle: 0 }
    const L = Math.max(0, Math.min(totalLength, len))
    const p = spinePathEl.getPointAtLength(L)
    const p2 = spinePathEl.getPointAtLength(Math.min(totalLength, L + 1))
    return { x: p.x, y: p.y, angle: Math.atan2(p2.y - p.y, p2.x - p.x) }
  }

  function computeBounds(list: RoadmapCard[]): { start: number; end: number } {
    const times = list
      .map((e) => e.targetDate)
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

  function findActiveHover(roots: TreeNode[], href: string | null): RoadmapCard | null {
    if (!href) return null
    for (const n of flattenTree(roots)) if (n.entry.href === href) return n.entry
    return null
  }

  function collectChangelogMarkers(roots: TreeNode[]): { date: string; version: string; href: string }[] {
    const out: { date: string; version: string; href: string }[] = []
    for (const n of flattenTree(roots)) {
      for (const ref of n.entry.changelog) {
        if (!ref.releaseDate) continue
        out.push({
          date: ref.releaseDate,
          version: ref.version,
          href: `${ref.path}#${ref.slug}`
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

  function captureRect(ev: Event) {
    const el = (ev?.currentTarget ?? ev?.target) as HTMLElement | null
    if (el && typeof el.getBoundingClientRect === 'function') {
      const r = el.getBoundingClientRect()
      hoverRect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    }
  }

  function onNodeEnter(entry: RoadmapCard, _side: 'left' | 'right', ev: Event) {
    hoverHref = entry.href
    captureRect(ev)
  }

  function onNodeLeave() {
    hoverHref = null
    hoverRect = null
  }

  function placeNearAnchor(
    rect: { left: number; top: number; right: number; bottom: number },
    pw: number,
    ph: number,
    favorMostSpace = true
  ): { left: number; top: number } {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 12
    const offset = 14
    const spaceRight = vw - rect.right - margin
    const spaceLeft = rect.left - margin
    let left: number
    if (favorMostSpace) {
      left = spaceRight >= spaceLeft ? rect.right + offset : rect.left - offset - pw
    } else if (pw <= spaceRight) left = rect.right + offset
    else if (pw <= spaceLeft) left = rect.left - offset - pw
    else left = spaceRight >= spaceLeft ? rect.right + offset : rect.left - offset - pw
    let top = rect.top + (rect.bottom - rect.top) / 2 - ph / 2
    left = Math.max(margin, Math.min(left, vw - pw - margin))
    top = Math.max(margin, Math.min(top, vh - ph - margin))
    return { left, top }
  }

  function portal(node: HTMLElement) {
    if (typeof document === 'undefined') return
    document.body.appendChild(node)
    return {
      destroy() {
        if (node.parentNode === document.body) document.body.removeChild(node)
      }
    }
  }

  function onNodeClick(entry: RoadmapCard, e: MouseEvent) {
    if (window.matchMedia('(max-width: 900px)').matches) {
      if (hoverHref !== entry.href) {
        e.preventDefault()
        hoverHref = entry.href
        return
      }
    }
    e.preventDefault()
    navigate(withBase(entry.href))
  }

  let flipFrom: Map<string, DOMRect> | null = null

  function playFlip(from: Map<string, DOMRect>) {
    if (!track || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    for (const el of Array.from(track.querySelectorAll<HTMLElement>('.np-rm-node'))) {
      const before = from.get(el.id)
      if (!before) continue
      const after = el.getBoundingClientRect()
      const dx = before.left - after.left
      const dy = before.top - after.top
      const sx = before.width / (after.width || 1)
      const sy = before.height / (after.height || 1)
      el.animate(
        [
          { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: 'top left', transform: 'none' }
        ],
        { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      )
    }
    const edges = track.querySelector('.np-roadmap-edges')
    edges?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' })
  }

  function toggleMode() {
    flipFrom = new Map(Array.from(track?.querySelectorAll<HTMLElement>('.np-rm-node') ?? []).map((el) => [el.id, el.getBoundingClientRect()]))
    mode = mode === 'straight' ? 'organic' : 'straight'
    localStorage.setItem('np-roadmap-mode', mode)
  }

  function onRocketClick() {
    if (changelogHref) navigate(withBase(changelogHref))
  }

  function measure() {
    if (!track) return
    trackHeight = track.offsetHeight
    trackWidth = track.offsetWidth
    narrow = typeof window !== 'undefined' && window.innerWidth <= 800
    measured = true
  }

  function measureLength() {
    if (!spinePathEl) return
    totalLength = spinePathEl.getTotalLength()
    if (viewAnchorLens) {
      anchorLens = viewAnchorLens
      ready = true
      return
    }
    const anchors = computeSpineAnchors(layout.rows, effectiveTrackW)
    const lens: number[] = []
    let from = 0
    for (const a of anchors) {
      let best = from
      let bestD = Infinity
      for (let l = from; l <= totalLength; l += 4) {
        const p = spinePathEl.getPointAtLength(l)
        const d = (p.x - a.x) ** 2 + (p.y - a.y) ** 2
        if (d < bestD) {
          bestD = d
          best = l
        }
        if (bestD < 4 && d > 400) break
      }
      lens.push(best)
      from = best
    }
    anchorLens = lens
    ready = true
  }

  let travelFrame = 0
  function scrollerOf(el: HTMLElement): HTMLElement {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p
    }
    return (document.scrollingElement as HTMLElement) ?? document.documentElement
  }

  function travel() {
    if (!entries.length || !track || !spinePathEl || totalLength === 0) return
    cancelAnimationFrame(travelFrame)
    const target = lenForDate(now)
    const duration = 18000
    const scroller = scrollerOf(track)
    const viewH = scroller === document.scrollingElement ? window.innerHeight : scroller.clientHeight
    const trackTopIn = () => track.getBoundingClientRect().top - (scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top) + scroller.scrollTop
    const follow = (y: number, ease: number) => {
      const desired = Math.max(0, trackTopIn() + y - viewH * 0.55)
      scroller.scrollTop += (desired - scroller.scrollTop) * ease
    }
    rocketLen = 0
    flying = true
    scroller.scrollTo({ top: Math.max(0, trackTopIn() + spinePathEl.getPointAtLength(0).y - viewH * 0.55), behavior: 'smooth' })
    setTimeout(() => {
      const t0 = performance.now()
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / duration)
        rocketLen = target * p
        if (spinePathEl) follow(spinePathEl.getPointAtLength(rocketLen).y, 0.18)
        if (p < 1) {
          travelFrame = requestAnimationFrame(step)
        } else {
          flying = false
          rocketLen = target
        }
      }
      travelFrame = requestAnimationFrame(step)
    }, 700)
  }

  async function hydrate() {
    for (const m of mounts) m.destroy()
    mounts = []
    await tick()
    if (!container) return
    const maths = container.querySelectorAll<HTMLElement>('.np-math[data-math]')
    for (const el of Array.from(maths)) {
      const source = decodeURIComponent(escape(atob(el.dataset.math ?? '')))
      const display = el.classList.contains('np-math-display')
      const host = document.createElement(display ? 'div' : 'span')
      el.replaceWith(host)
      const instance = mount(MathBlock, { target: host, props: { source, display } })
      mounts.push({ destroy: () => unmount(instance) })
    }

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

    for (const el of Array.from(container.querySelectorAll<HTMLDivElement>('.np-d2'))) {
      const host = document.createElement('div')
      const props = {
        diagram: decodeURIComponent(escape(atob(el.dataset.diagram ?? ''))),
        error: el.dataset.error ?? '',
        label: el.dataset.label ?? ''
      }
      el.replaceWith(host)
      const instance = mount(D2Block, { target: host, props })
      mounts.push({ destroy: () => unmount(instance) })
    }
    for (const el of Array.from(container.querySelectorAll<HTMLDivElement>('.np-dbml[data-schema]'))) {
      let schema = ''
      try {
        schema = decodeURIComponent(escape(atob(el.dataset.schema ?? '')))
      } catch {}
      const host = document.createElement('div')
      el.replaceWith(host)
      const instance = mount(DBMLBlock, {
        target: host,
        props: { schema, error: el.dataset.error ?? '', height: el.dataset.height || '520px' }
      })
      mounts.push({ destroy: () => unmount(instance) })
    }
    const tabGroups = container.querySelectorAll<HTMLElement>('.np-tabs')
    for (const group of Array.from(tabGroups)) {
      if (group.parentElement?.classList.contains('np-tabs-mount')) continue
      const panels = Array.from(group.children).filter((el) => el.classList.contains('np-tabs-panel'))
      if (!panels.some((panel) => panel.hasAttribute('data-label'))) continue
      const tabs = panels.map((panel) => ({
        label: panel.getAttribute('data-label') ?? '',
        id: panel.getAttribute('data-id') ?? ''
      }))
      const host = document.createElement('div')
      host.className = 'np-tabs-mount'
      group.replaceWith(host)
      const instance = mount(Tabs, {
        target: host,
        props: {
          tabs,
          linked: group.getAttribute('data-linked') === 'true',
          panel: createRawSnippet((_tab: () => unknown, index: () => number) => ({
            render: () => '<div class="np-tabs-body"></div>',
            setup: (body) => {
              body.replaceChildren(...Array.from(panels[index()].childNodes))
            }
          }))
        }
      })
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
    if (localStorage.getItem('np-roadmap-mode') === 'straight') mode = 'straight'
    void hydrate()
    let ro: ResizeObserver | null = null
    requestAnimationFrame(() => {
      measure()
      requestAnimationFrame(() => {
        measureLength()
        rocketLen = lenForDate(now)
      })
    })
    if (typeof ResizeObserver !== 'undefined' && track) {
      ro = new ResizeObserver(() => {
        measure()
        measureLength()
      })
      ro.observe(track)
    }
    const onResize = () => {
      measure()
      measureLength()
    }
    window.addEventListener('resize', onResize)
    const stopSpy = setupHashSpy({ root: container, selector: '.np-rm-node[id]' })
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', onResize)
      stopSpy()
      for (const m of mounts) m.destroy()
    }
  })

  $effect(() => {
    modalView
    popupH
    if (!asideEl) {
      asideOverflow = false
      return
    }
    asideOverflow = asideEl.scrollHeight > asideEl.clientHeight + 1
  })

  $effect(() => {
    spinePath
    tick().then(measureLength)
  })

  $effect(() => {
    if (!flying) rocketLen = lenForDate(now)
  })

  $effect(() => {
    page.slug
    void hydrate()
  })
</script>

{#if renderBackground}
  <div class="np-page-background" style:background-image={`url('${withBase(background)}')`}></div>
{/if}
<div class="np-page-shell np-roadmap-shell">
  <div class="np-page np-roadmap-page">
    <section class="np-roadmap-hero" bind:this={container}>
      <p class="np-roadmap-eyebrow">Roadmap</p>
      <h1 class="np-roadmap-hero-title">{page.frontmatter.title}</h1>
      <div class="np-roadmap-hero-actions">
        <button class="np-roadmap-mode" type="button" aria-pressed={mode === 'straight'} onclick={toggleMode}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            {#if mode === 'straight'}
              <path d="M8 1 C 2 5, 14 9, 8 15" />
            {:else}
              <path d="M8 1 L 8 15 M4 4 L 8 4 M8 11 L 12 11" />
            {/if}
          </svg>
          <span>{mode === 'straight' ? 'Organic' : 'Straight'}</span>
        </button>
        <button class="np-roadmap-travel" type="button" onclick={travel}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M4 2 L 14 8 L 4 14 Z" fill="currentColor" />
          </svg>
          <span>Travel</span>
        </button>
      </div>
      {#if page.frontmatter.description}
        <p class="np-roadmap-hero-tagline">{page.frontmatter.description}</p>
      {/if}
      {#if page.html}
        <div class="np-roadmap-hero-body np-prose">{@html page.html}</div>
      {/if}
    </section>

    <div
      class="np-roadmap-track"
      class:np-roadmap-ready={ready}
      bind:this={track}
      style:--np-rm-cols={GRID_COLS}
      style:--np-rm-rows={Math.max(1, layout.gridRows)}
    >
      {#if loaderShown && !ready}
        <div class="np-roadmap-loading" role="status">
          <span class="np-roadmap-loading-ring" aria-hidden="true"></span>
          <span>Building the roadmap</span>
        </div>
      {/if}
      <svg
        class="np-roadmap-edges"
        viewBox={`0 0 ${trackWidth || 1100} ${layout.totalH}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {#each layout.links as e (e.id)}
          <path d={e.d} class="np-roadmap-edge" />
        {/each}
        {#each spineConnectors as c (c.id)}
          <path d={c.d} class="np-roadmap-spine-connector" />
        {/each}
        {#if spinePath}
          <path d={spinePath} class="np-roadmap-spine-path" bind:this={spinePathEl} />
        {/if}
        {#if spinePath && rocketShown}
          <path
            d={spinePath}
            class="np-roadmap-spine-trail"
            style:stroke-dasharray={`${totalLength}`}
            style:stroke-dashoffset={`${trailDashoffset}`}
          />
        {/if}
      </svg>

      {#each layout.rows as r, ri (r.rootEntry.href)}
        {#each r.boxes as b, bi (b.entry.href)}
          <RoadmapNode
            order={ri * 3 + bi}
            entry={b.entry}
            variant={b.variant}
            straight={mode === 'straight'}
            side={r.side}
            col={b.col}
            row={b.row}
            cols={b.cols}
            rows={b.rows}
            onClick={(e) => onNodeClick(b.entry, e)}
            onEnter={(e) => onNodeEnter(b.entry, r.side, e)}
            onLeave={onNodeLeave}
          />
        {/each}
      {/each}

      {#each spineConnectors as c (c.id + ':dot')}
        <span class="np-roadmap-issue-dot" style:left={`${c.cx}px`} style:top={`${c.cy}px`}></span>
      {/each}

      {#if spineTopPoint}
        <div class="np-roadmap-top-arrow" style:left={`${spineTopPoint.x}px`} style:top={`${spineTopPoint.y}px`}>
          <svg
            viewBox="0 0 24 28"
            width="20"
            height="24"
            aria-hidden="true"
            fill="none"
            stroke="var(--np-text-muted)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray="2.5 2.5"
            opacity="0.9"
          >
            <line x1="12" y1="26" x2="12" y2="4" />
            <polyline points="5 11 12 4 19 11" />
          </svg>
        </div>
      {/if}

      {#if rocketShown}
        <div
          class="np-roadmap-today"
          style:left={`${todayMarker.x}px`}
          style:top={`${todayMarker.y}px`}
        >
          <span class="np-roadmap-today-line" style:transform={`translate(-50%, -50%) rotate(${todayMarker.deg}deg)`}></span>
          <span
            class="np-roadmap-today-label"
            style:transform={`translate(-50%, -50%) translate(${todayMarker.labelX}px, ${todayMarker.labelY}px)`}
          >{formatDate(now)}</span>
        </div>
        <div
          class="np-roadmap-rocket"
          class:flying
          class:np-roadmap-rocket-link={!!changelogHref}
          role="button"
          tabindex="0"
          aria-label="Changelog"
          style:left={`${rocketPoint.x}px`}
          style:top={`${rocketPoint.y}px`}
          style:transform={`translate(-50%, -50%) rotate(${rocketPoint.angle + Math.PI / 2}rad)`}
          onmouseenter={(e) => { rocketHover = true; captureRect(e) }}
          onmouseleave={() => { rocketHover = false; hoverRect = null }}
          onclick={onRocketClick}
          onkeydown={(e) => e.key === 'Enter' && onRocketClick()}
        >
          <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
            <path d="M12 2 C 16 6, 17 12, 12 22 C 7 12, 8 6, 12 2 Z" fill="var(--np-brand)" />
            <circle cx="12" cy="9" r="2.4" fill="var(--np-bg-card)" />
            <path d="M8 15 L 5 20 L 9 18 Z M16 15 L 19 20 L 15 18 Z" fill="var(--np-brand)" opacity="0.7" />
          </svg>
        </div>
      {/if}

      {#if entries.length === 0}
        <p class="np-roadmap-empty">No items.</p>
      {/if}
    </div>

    <div class="np-roadmap-planet" class:np-roadmap-ready={ready}>
      <div class="np-roadmap-planet-box">
        <div class="np-roadmap-planet-globe">
          <PlanetFooter preserveAspectRatio="xMidYMid meet" />
        </div>
      </div>
      <div class="np-roadmap-planet-fade"></div>
      {#if effectiveFooter}
        <p class="np-roadmap-footer-text">{effectiveFooter}</p>
      {/if}
    </div>
  </div>
</div>

{#if modalView}
  <div class="np-roadmap-modal-root" use:portal>
    <div
      class="np-roadmap-modal-content"
      class:np-roadmap-modal-placed={!!popupPos}
      style:left={popupPos ? `${popupPos.left}px` : null}
      style:top={popupPos ? `${popupPos.top}px` : null}
      style:opacity={popupW === 0 ? '0' : null}
    >
  <aside class="np-roadmap-aside" bind:this={asideEl} bind:clientWidth={popupW} bind:clientHeight={popupH}>
    <header class="np-roadmap-aside-head">
      {#if modalView.kind}
        <span class="np-roadmap-card-kind">{kindLabel(modalView.kind)}</span>
      {/if}
      <h2>{modalView.title}</h2>
      {#if modalView.date}
        <span class="np-roadmap-aside-date">{formatDate(modalView.date)}</span>
      {/if}
    </header>
    {#if modalView.description}
      <p class="np-roadmap-aside-desc">{modalView.description}</p>
    {/if}
    {#if modalView.html}
      <div class="np-roadmap-aside-body">{@html modalView.html}</div>
    {/if}
    {#if modalView.changelog.length}
      <ul class="np-roadmap-aside-changelog">
        {#each modalView.changelog as ref (ref.entrySlug)}
          <li>
            <a href={withBase(ref.entrySlug)}>
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
    {#if asideOverflow}
      <footer class="np-roadmap-aside-more">Click to see more</footer>
    {/if}
  </aside>
    </div>
  </div>
{/if}

<BackToTop />

<style>
  .np-page-shell {
    display: grid;
    grid-template-columns: minmax(0, var(--np-content-max));
    justify-content: center;
    width: 100%;
  }
  .np-roadmap-shell {
    grid-template-columns: minmax(0, 1fr);
  }
  .np-page.np-roadmap-page {
    padding: 0;
    max-width: max(var(--np-content-max), 150vh);
    container-type: inline-size;
  }
  .np-page {
    width: 100%;
    max-width: var(--np-content-max);
    margin: 0 auto;
    padding: 0;
    box-sizing: border-box;
    min-width: 0;
  }

  .np-roadmap-hero {
    position: relative;
    width: 100%;
    max-width: var(--np-content-max);
    box-sizing: border-box;
    margin: 0 auto;
    padding: 56px 48px 40px;
    display: grid;
    grid-template-columns: 1fr min-content;
    grid-template-rows: auto auto auto auto;
    column-gap: 32px;
    align-items: start;
  }
  .np-roadmap-hero-actions {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: start;
    justify-self: end;
    display: flex;
    gap: 10px;
  }
  .np-roadmap-travel,
  .np-roadmap-mode {
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
    white-space: nowrap;
  }
  .np-roadmap-mode {
    border-color: var(--np-border);
    background-color: transparent;
    color: var(--np-text-secondary);
  }
  .np-roadmap-travel:hover,
  .np-roadmap-mode:hover {
    background-color: color-mix(in srgb, var(--np-brand) 18%, transparent);
    border-color: var(--np-brand);
    transform: translateY(-1px);
  }
  .np-roadmap-travel:focus-visible,
  .np-roadmap-mode:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 3px;
  }
  .np-roadmap-travel svg,
  .np-roadmap-mode svg { display: block; }
  .np-roadmap-loading {
    grid-column: 1 / -1;
    grid-row: 1 / -1;
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    color: var(--np-text-muted);
    font-size: 13px;
    letter-spacing: 0.04em;
  }
  .np-roadmap-loading-ring {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--np-brand) 25%, transparent);
    border-top-color: var(--np-brand);
    animation: np-roadmap-spin 0.9s linear infinite;
  }
  .np-roadmap-track:not(.np-roadmap-ready) > :not(.np-roadmap-loading) {
    opacity: 0;
  }
  .np-roadmap-ready > :global(.np-rm-node) {
    animation: np-roadmap-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(min(var(--np-rm-order, 0), 60) * 12ms);
  }
  .np-roadmap-ready > :not(.np-roadmap-loading):not(:global(.np-rm-node)) {
    animation: np-roadmap-fade 0.8s ease both 0.15s;
  }
  .np-roadmap-planet {
    transition: opacity 0.8s ease 0.25s;
  }
  .np-roadmap-planet:not(.np-roadmap-ready) {
    opacity: 0;
  }
  @keyframes np-roadmap-rise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }
  @keyframes np-roadmap-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes np-roadmap-spin {
    to { transform: rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .np-roadmap-loading-ring { animation: none; }
    .np-roadmap-ready > :global(.np-rm-node),
    .np-roadmap-ready > :not(.np-roadmap-loading) { animation: none; }
  }
  .np-roadmap-eyebrow {
    grid-column: 1;
    grid-row: 1;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 12px;
    color: var(--np-brand);
    font-weight: 700;
    margin: 0 0 16px;
  }
  .np-roadmap-hero-title {
    grid-column: 1;
    grid-row: 2;
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
    grid-column: 1 / -1;
    grid-row: 3;
    font-size: 22px;
    line-height: 1.4;
    color: var(--np-text-primary);
    margin: 0 0 16px;
    font-weight: 500;
    max-width: 60ch;
  }
  .np-roadmap-hero-body {
    grid-column: 1 / -1;
    grid-row: 4;
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
    display: grid;
    grid-template-columns: repeat(var(--np-rm-cols), minmax(0, 1fr));
    grid-template-rows: repeat(var(--np-rm-rows), calc(100cqi / var(--np-rm-cols)));
    padding: 0;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .np-roadmap-edges {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    overflow: visible;
  }
  .np-roadmap-edge {
    fill: none;
    stroke: var(--np-brand);
    stroke-width: 1.5;
    stroke-linecap: round;
    opacity: 0.45;
  }
  .np-roadmap-spine-path {
    fill: none;
    stroke: var(--np-brand, #b9b);
    stroke-width: 2;
    stroke-dasharray: 6 6;
    opacity: 0.7;
  }
  .np-roadmap-spine-trail {
    fill: none;
    stroke: var(--np-brand, #b9b);
    stroke-width: 3;
    stroke-linecap: round;
    opacity: 0.95;
  }
  .np-roadmap-spine-connector {
    fill: none;
    stroke: var(--np-brand, #b9b);
    stroke-width: 1.5;
    opacity: 0.55;
  }
  .np-roadmap-issue-dot {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--np-bg-card);
    border: 2px solid var(--np-brand, #b9b);
    transform: translate(-50%, -50%);
    z-index: 3;
    pointer-events: none;
  }
  .np-roadmap-planet {
    position: relative;
    width: 100%;
    height: 400px;
    overflow: hidden;
    pointer-events: none;
  }
  .np-roadmap-planet-box {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    pointer-events: none;
  }
  .np-roadmap-planet-globe {
    position: relative;
    width: 1024px;
    height: 1024px;
    flex-shrink: 0;
    pointer-events: none;
  }
  .np-roadmap-planet-fade {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 100% at 50% 0%, transparent 0%, transparent 55%, var(--np-bg) 100%),
      linear-gradient(to bottom, transparent 0%, transparent 35%, var(--np-bg) 90%);
    pointer-events: none;
    z-index: 1;
  }
  .np-roadmap-footer-text {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 28px;
    margin: 0;
    text-align: center;
    color: var(--np-text-secondary);
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-line;
    pointer-events: auto;
    z-index: 2;
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
  }
  .np-roadmap-today {
    position: absolute;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 3;
    white-space: nowrap;
  }
  .np-roadmap-today-line {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 50% 50%;
    width: 60px;
    height: 0;
    border-top: 1px dotted var(--np-border);
    opacity: 0.9;
  }
  .np-roadmap-today-label {
    position: absolute;
    left: 0;
    top: 0;
    color: var(--np-text-muted);
    font-family: var(--np-font-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
  }

  .np-roadmap-rocket {
    position: absolute;
    transform-origin: 50% 50%;
    z-index: 4;
    will-change: transform, top, left;
    transition: top 0.4s ease, left 0.4s ease, transform 0.4s ease;
    filter: drop-shadow(0 6px 18px color-mix(in srgb, var(--np-brand) 35%, transparent));
  }
  .np-roadmap-rocket.flying {
    transition: none;
  }
  .np-roadmap-rocket-link {
    cursor: pointer;
  }
  .np-roadmap-top-arrow {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 3;
    pointer-events: none;
    line-height: 0;
    filter: drop-shadow(0 4px 12px color-mix(in srgb, var(--np-brand) 30%, transparent));
  }

  .np-roadmap-modal-root {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .np-roadmap-modal-content {
    display: flex;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
    pointer-events: none;
  }
  .np-roadmap-modal-content.np-roadmap-modal-placed {
    position: fixed;
    transition: left 0.12s ease, top 0.12s ease;
  }
  .np-roadmap-aside {
    position: relative;
    width: max-content;
    min-width: min(320px, calc(100vw - 24px));
    max-width: min(560px, calc(100vw - 24px));
    max-height: min(440px, calc(100vh - 24px));
    overflow: hidden;
    box-sizing: border-box;
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    box-shadow: var(--np-shadow-dialog);
    padding: 20px 22px;
    pointer-events: auto;
  }
  .np-roadmap-aside-more {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 64px 22px 16px;
    background: linear-gradient(to bottom, transparent, var(--np-bg-card) 55%);
    text-align: center;
    color: var(--np-brand);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
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
    .np-roadmap-hero { padding: 32px 20px 24px; }
    .np-roadmap-hero-title { font-size: 38px; }
    .np-roadmap-hero-tagline { font-size: 18px; }
    .np-roadmap-aside { display: none; }
  }

  .np-roadmap-empty {
    color: var(--np-text-muted);
    font-style: italic;
    text-align: center;
    padding: 32px;
  }

  .np-page-background {
    position: absolute;
    top: 0;
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
