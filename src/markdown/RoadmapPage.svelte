<script lang="ts">
  import { onMount, tick, mount, unmount, createRawSnippet } from 'svelte'
  import type { PageModule, RoadmapEntry, RoadmapKind, RoadmapChangelogRef } from '../types'
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

  const MermaidBlock = themed('MermaidBlock', StockMermaidBlock)
  const D2Block = themed('D2Block', StockD2Block)
  const MathBlock = themed('MathBlock', StockMathBlock)
  const DBMLBlock = themed('DBMLBlock', StockDBMLBlock)
  const BackToTop = themed('BackToTop', StockBackToTop)
  const CodeBlock = themed('CodeBlock', StockCodeBlock)
  const CodeGroup = themed('CodeGroup', StockCodeGroup)
  const Tabs = themed('Tabs', StockTabs)

  let { page }: { page: PageModule } = $props()

  const entries = $derived<RoadmapEntry[]>(page.roadmapEntries ?? [])
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
  let totalLength = $state(0)
  let anchorLens = $state<number[]>([])
  let rocketLen = $state(0)
  let flying = $state(false)
  let now = $state(new Date().toISOString())
  const GRID_COLS = 96
  const GRID_MARGIN = 2
  const GRID_CORRIDOR = 16
  const GRID_TOP = 8
  const GRID_BOTTOM = 12
  const GRID_CLUSTER_GAP = 12
  const RING_GAPS = [6, 4, 2]
  const RING_VERTICAL = 1.5
  const GRID_SPINE_INSET = 2
  const ANCHOR_GAP = 8
  const FILL_PX = 46
  const BLOB_TEXT_SHARE = 0.8
  const NARROW_SPINE_COL = 8
  const NARROW_CARD_COL = 20

  type NodeVariant = 'card' | 'compact' | 'small' | 'pill'

  const TIERS: NodeVariant[] = ['compact', 'small', 'pill']

  interface TreeNode {
    entry: RoadmapEntry
    depth: number
    children: TreeNode[]
  }

  interface NodeBox {
    entry: RoadmapEntry
    depth: number
    variant: NodeVariant
    col: number
    row: number
    cols: number
    rows: number
    x: number
    y: number
    w: number
    h: number
    anchorX?: number
    anchorY?: number
    anchorSide?: 'left' | 'right'
    date?: number
  }

  interface RowLayout {
    rootEntry: RoadmapEntry
    side: 'left' | 'right'
    boxes: NodeBox[]
    top: number
    cellSide: number
    issueCellX: number
    pathCellX: number
    pathCenterX: number
    rowMid: number
    gapAfter: number
    spineAnchorX: number
    spineAnchorY: number
  }

  interface Rect {
    x: number
    y: number
    w: number
    h: number
  }

  interface Link {
    id: string
    d: string
  }

  interface TrackLayout {
    rows: RowLayout[]
    links: Link[]
    blocked: Rect[]
    budgets: number[]
    cell: number
    gridRows: number
    totalH: number
  }

  function buildTree(list: RoadmapEntry[]): TreeNode[] {
    const byHref = new Map(list.map((e) => [e.href, e]))
    const childMap = new Map<string, RoadmapEntry[]>()
    for (const e of list) {
      if (e.parent && byHref.has(e.parent)) {
        const arr = childMap.get(e.parent) ?? []
        arr.push(e)
        childMap.set(e.parent, arr)
      }
    }
    function build(entry: RoadmapEntry, depth: number, seen: Set<string>): TreeNode {
      if (seen.has(entry.href)) return { entry, depth, children: [] }
      const nextSeen = new Set(seen).add(entry.href)
      const kids = (childMap.get(entry.href) ?? [])
        .slice()
        .sort((a, b) => (b.targetDate ?? '').localeCompare(a.targetDate ?? ''))
        .map((k) => build(k, depth + 1, nextSeen))
      return { entry, depth, children: kids }
    }
    const roots: TreeNode[] = []
    for (const e of list) {
      if (!e.parent || !byHref.has(e.parent)) {
        roots.push(build(e, 0, new Set()))
      }
    }
    roots.sort((a, b) => (b.entry.targetDate ?? '').localeCompare(a.entry.targetDate ?? ''))
    return roots
  }

  function clampPx(min: number, share: number, max: number, width: number): number {
    return Math.max(min, Math.min(max, share * width))
  }

  function contentRows(entry: RoadmapEntry, variant: NodeVariant, cols: number, cell: number): number {
    const textW = cols * cell * BLOB_TEXT_SHARE
    const lines = (text: string, font: number, max: number) => Math.max(1, Math.min(max, Math.ceil((text.length * font * 0.55) / textW)))
    let h: number
    if (variant === 'pill') {
      h = 9 * 1.3 + 3 + 12.5 * 1.1
    } else {
      const head = variant === 'small' ? clampPx(6.5, 0.054, 9, textW) : clampPx(7, 0.042, 11, textW)
      const title = variant === 'card' ? clampPx(11, 0.074, 19, textW) : variant === 'compact' ? clampPx(10.5, 0.086, 15, textW) : clampPx(10, 0.09, 13, textW)
      h = head * 1.7 + 5.6 + lines(entry.title, title, variant === 'small' ? 1 : 2) * title * 1.25
      if (variant === 'card' && entry.description) {
        const desc = clampPx(9.5, 0.05, 13.5, textW)
        h += 5.6 + lines(entry.description, desc, 3) * desc * 1.45
      }
    }
    return Math.ceil(h / BLOB_TEXT_SHARE / cell) + 1
  }

  function rootCellsFor(root: TreeNode, cell: number): [number, number][] {
    const major = root.children.length || root.entry.kind === 'epic' || root.entry.kind === 'milestone'
    return (major ? [32, 28, 24, 20] : [24, 20, 18]).map((cols) => [cols, contentRows(root.entry, 'card', cols, cell)])
  }

  function childCellsFor(node: TreeNode, variant: NodeVariant, cell: number): [number, number] {
    const titleFont = variant === 'compact' ? 15 : variant === 'small' ? 13 : 12.5
    const dateFont = variant === 'compact' ? 10 : 9
    const textPx = Math.max(node.entry.title.length * titleFont * 0.55, 10 * dateFont * 0.62) + 10
    const cols = Math.max(10, Math.min(variant === 'compact' ? 24 : 28, Math.ceil(textPx / BLOB_TEXT_SHARE / cell)))
    return [cols, contentRows(node.entry, variant, cols, cell)]
  }

  function seeded(input: string): number {
    let h = 2166136261
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return ((h >>> 0) % 10000) / 10000
  }

  function segmentBudget(hours: number, minHours: number): number {
    return Math.round(9 * (1 + 1.5 * Math.sqrt(Math.max(1, hours / minHours) - 1)))
  }

  const tree = $derived(buildTree(entries))
  const effectiveTrackW = $derived(trackWidth || 1100)
  const layout = $derived(layoutTrack(tree, effectiveTrackW))
  const spinePath = $derived(buildSpinePath(layout, effectiveTrackW, Math.max(trackHeight, layout.totalH)))
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

  interface Placed {
    node: TreeNode
    parent: Placed | null
    variant: NodeVariant
    col: number
    row: number
    cols: number
    rows: number
  }

  interface Packed {
    placed: Placed[]
    width: number
    height: number
    links: { id: string; points: { x: number; y: number }[] }[]
  }

  function toTime(e: RoadmapEntry): number {
    return e.targetDate ? new Date(e.targetDate).getTime() : 0
  }

  function packCluster(root: TreeNode, rootSize: [number, number], tier: number, width: number, height: number, cell: number, gap: number): Packed | null {
    const [rc, rr] = rootSize
    if (rc > width || rr > height) return null
    const occ = new Uint8Array(width * height)
    const sum = new Int32Array((width + 1) * (height + 1))
    const fill = (c: number, r: number, w: number, h: number) => {
      for (let y = Math.max(0, r); y < Math.min(height, r + h); y++)
        for (let x = Math.max(0, c); x < Math.min(width, c + w); x++) occ[y * width + x] = 1
    }
    const rebuild = () => {
      for (let y = 0; y < height; y++) {
        let line = 0
        for (let x = 0; x < width; x++) {
          line += occ[y * width + x]
          sum[(y + 1) * (width + 1) + x + 1] = sum[y * (width + 1) + x + 1] + line
        }
      }
    }
    const used = (c: number, r: number, w: number, h: number) => {
      const c0 = Math.max(0, c)
      const r0 = Math.max(0, r)
      const c1 = Math.min(width, c + w)
      const r1 = Math.min(height, r + h)
      if (c1 <= c0 || r1 <= r0) return 0
      const W = width + 1
      return sum[r1 * W + c1] - sum[r0 * W + c1] - sum[r1 * W + c0] + sum[r0 * W + c0]
    }

    const rootRow = Math.floor((height - rr) / 2)
    const rootP: Placed = { node: root, parent: null, variant: 'card', col: 0, row: rootRow, cols: rc, rows: rr }
    fill(0, rootRow, rc, rr)

    const placed: Placed[] = [rootP]
    const byNode = new Map<TreeNode, Placed>([[root, rootP]])
    const parentOf = new Map<TreeNode, TreeNode>()
    const walk = (n: TreeNode) => n.children.forEach((k) => { parentOf.set(k, n); walk(k) })
    walk(root)
    const byDate = flattenTree(root.children).sort((a, b) => toTime(a.entry) - toTime(b.entry))
    const rank = new Map(byDate.map((n, i) => [n, byDate.length === 1 ? 0.5 : i / (byDate.length - 1)]))
    const order = [...byDate].sort((a, b) => a.depth - b.depth || toTime(a.entry) - toTime(b.entry))
    const SPAN = Math.PI * 1.15

    for (const k of order) {
      rebuild()
      const parent = byNode.get(parentOf.get(k)!)!
      const pcx = parent.col + parent.cols / 2
      const pcy = parent.row + parent.rows / 2
      const target = parent === rootP
        ? (0.5 - rank.get(k)!) * SPAN
        : Math.atan2(pcy - (rootRow + rr / 2), pcx - rc / 2)
      const baseTier = k.depth > 1 ? TIERS.length - 1 : tier
      let best: Placed | null = null
      let bestCost = Infinity
      for (let L = 1; L <= 10; L++) {
        const v = TIERS[Math.min(TIERS.length - 1, baseTier + (L > 1 ? 1 : 0))]
        const [kc, kr] = childCellsFor(k, v, cell)
        const jitter = (seeded(k.entry.href + L) - 0.5) * 0.3
        const stretch = 1 + (seeded(k.entry.href + 'r' + L) - 0.5) * 0.14
        const rx = (parent.cols / 2 + gap + kc / 2 + (L - 1) * (kc * 0.8 + gap)) * stretch
        const ry = (parent.rows / 2 + gap + kr / 2 + (L - 1) * (kr + gap)) * stretch * RING_VERTICAL
        for (let a = -SPAN * 0.55; a <= SPAN * 0.55; a += 0.03) {
          const col = Math.round(pcx + rx * Math.cos(a) - kc / 2)
          const row = Math.round(pcy + ry * Math.sin(a) - kr / 2)
          if (col < GRID_SPINE_INSET || row < 0 || col + kc > width || row + kr > height) continue
          const cost = (L - 1) * 1.6 + Math.abs(a - target - jitter)
          if (cost >= bestCost) continue
          if (used(col - 1, row - 1, kc + 2, kr + 2)) continue
          bestCost = cost
          best = { node: k, parent, variant: v, col, row, cols: kc, rows: kr }
        }
        if (best && bestCost < L * 1.6) break
      }
      if (!best) return null
      fill(best.col, best.row, best.cols, best.rows)
      placed.push(best)
      byNode.set(k, best)
    }

    let minRow = height
    let maxRow = 0
    let maxCol = 0
    for (const p of placed) {
      minRow = Math.min(minRow, p.row)
      maxRow = Math.max(maxRow, p.row + p.rows)
      maxCol = Math.max(maxCol, p.col + p.cols)
    }
    const links = placed.slice(1).map((p) => ({
      id: `${p.parent!.node.entry.href}->${p.node.entry.href}`,
      points: routeLink(occ, width, height, p.parent!, p)
    }))
    for (const p of placed) p.row -= minRow
    for (const l of links) for (const pt of l.points) pt.y -= minRow
    return { placed, width: maxCol, height: maxRow - minRow, links }
  }

  function routeLink(occ: Uint8Array, width: number, height: number, from: Placed, to: Placed): { x: number; y: number }[] {
    const free = (c: number, r: number) => c >= 0 && r >= 0 && c < width && r < height && occ[r * width + c] === 0
    const ring = (p: Placed) => {
      const out: [number, number][] = []
      for (let c = p.col; c < p.col + p.cols; c++) out.push([c, p.row - 1], [c, p.row + p.rows])
      for (let r = p.row; r < p.row + p.rows; r++) out.push([p.col - 1, r], [p.col + p.cols, r])
      return out.filter(([c, r]) => free(c, r))
    }
    const contact = (p: Placed, c: number, r: number) => {
      const a = p.cols / 2
      const b = p.rows / 2
      const cx = p.col + a
      const cy = p.row + b
      const dx = c + 0.5 - cx
      const dy = r + 0.5 - cy
      const t = Math.pow(Math.pow(Math.abs(dx / a), 4) + Math.pow(Math.abs(dy / b), 4), -0.25)
      return { x: cx + dx * t, y: cy + dy * t }
    }
    const goals = new Set(ring(to).map(([c, r]) => r * width + c))
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    const cost = new Int32Array(width * height * 4).fill(1 << 30)
    const prev = new Int32Array(width * height * 4).fill(-1)
    const buckets: number[][] = []
    for (const [c, r] of ring(from)) {
      for (let d = 0; d < 4; d++) {
        const s = (r * width + c) * 4 + d
        cost[s] = 0
        ;(buckets[0] ??= []).push(s)
      }
    }
    let found = -1
    for (let b = 0; b < buckets.length && found < 0; b++) {
      const list = buckets[b]
      if (!list) continue
      for (let i = 0; i < list.length; i++) {
        const s = list[i]
        if (cost[s] !== b) continue
        const cellIdx = s >> 2
        if (goals.has(cellIdx)) { found = s; break }
        const d = s & 3
        const c = cellIdx % width
        const r = Math.floor(cellIdx / width)
        for (let nd = 0; nd < 4; nd++) {
          const nc = c + dirs[nd][0]
          const nr = r + dirs[nd][1]
          if (!free(nc, nr)) continue
          const ns = (nr * width + nc) * 4 + nd
          const nb = b + 2 + (nd === d ? 0 : 5)
          if (nb < cost[ns]) {
            cost[ns] = nb
            prev[ns] = s
            ;(buckets[nb] ??= []).push(ns)
          }
        }
      }
    }
    const fromCenter = { x: from.col + from.cols / 2, y: from.row + from.rows / 2 }
    const toCenter = { x: to.col + to.cols / 2, y: to.row + to.rows / 2 }
    if (found < 0) return [fromCenter, toCenter]
    const cells: [number, number][] = []
    for (let s = found; s >= 0; s = prev[s]) {
      const idx = s >> 2
      cells.unshift([idx % width, Math.floor(idx / width)])
    }
    const first = cells[0]
    const last = cells[cells.length - 1]
    const corners = cells.filter((cur, i) => {
      if (i === 0 || i === cells.length - 1) return true
      const a = cells[i - 1]
      const b = cells[i + 1]
      return (cur[0] - a[0]) * (b[1] - a[1]) - (cur[1] - a[1]) * (b[0] - a[0]) !== 0
    })
    return [
      contact(from, first[0], first[1]),
      ...corners.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 })),
      contact(to, last[0], last[1])
    ]
  }

  function clusterFor(root: TreeNode, cell: number): Packed {
    const count = flattenTree(root.children).length
    const rootOpts = rootCellsFor(root, cell)
    const maxW = GRID_COLS - 2 * GRID_MARGIN - GRID_CORRIDOR
    if (!root.children.length) {
      const [rc, rr] = rootOpts[0]
      return packCluster(root, rootOpts[0], 0, rc, rr, cell, RING_GAPS[0])!
    }
    const combos = TIERS
      .flatMap((_, ti) => rootOpts.map((size, ri) => ({ ti, size, score: ti * 2 + ri })))
      .sort((a, b) => a.score - b.score)
    for (const { ti, size } of combos) {
      const base = size[1] + Math.ceil(Math.sqrt(count)) * 14
      for (const gap of RING_GAPS) {
        for (const stretch of [1, 1.3, 1.6, 2]) {
          const packed = packCluster(root, size, ti, maxW, Math.round(base * stretch), cell, gap)
          if (packed) return packed
        }
      }
    }
    return packCluster(root, rootOpts[0], TIERS.length - 1, maxW, 600, cell, RING_GAPS[RING_GAPS.length - 1])!
  }

  function layoutTrackNarrow(roots: TreeNode[], w: number): TrackLayout {
    const cell = w / GRID_COLS
    const sorted = flattenTree(roots).sort((a, b) => toTime(a.entry) - toTime(b.entry))
    const cardRows = Math.max(8, Math.round(170 / cell))
    const gapRows = Math.round(96 / cell)
    const cardCols = GRID_COLS - NARROW_CARD_COL - GRID_MARGIN
    const gridRows = GRID_TOP * 2 + sorted.length * cardRows + Math.max(0, sorted.length - 1) * gapRows + GRID_BOTTOM * 2
    const rows: RowLayout[] = []
    let bottom = gridRows - GRID_BOTTOM * 2
    for (const n of sorted) {
      const row = bottom - cardRows
      const box: NodeBox = {
        entry: n.entry,
        depth: 0,
        variant: 'card',
        col: NARROW_CARD_COL,
        row,
        cols: cardCols,
        rows: cardRows,
        x: NARROW_CARD_COL * cell,
        y: row * cell,
        w: cardCols * cell,
        h: cardRows * cell,
        anchorSide: 'right',
        anchorX: NARROW_SPINE_COL * cell,
        anchorY: (row + cardRows / 2) * cell,
        date: toTime(n.entry)
      }
      rows.push({
        rootEntry: n.entry,
        side: 'right',
        boxes: [box],
        top: box.y,
        cellSide: box.h,
        issueCellX: box.x,
        pathCellX: 0,
        pathCenterX: box.anchorX!,
        rowMid: box.anchorY!,
        gapAfter: 0,
        spineAnchorX: box.anchorX!,
        spineAnchorY: box.anchorY!
      })
      bottom = row - gapRows
    }
    return { rows, links: [], blocked: [], budgets: [], cell, gridRows, totalH: gridRows * cell }
  }

  function layoutTrack(roots: TreeNode[], w: number): TrackLayout {
    const cell = w / GRID_COLS
    if (roots.length === 0) return { rows: [], links: [], blocked: [], budgets: [], cell, gridRows: 0, totalH: 0 }
    if (narrow) return layoutTrackNarrow(roots, w)

    const sortedRoots = [...roots].sort((a, b) => toTime(a.entry) - toTime(b.entry))
    const N = sortedRoots.length
    const HOUR_MS = 3600000
    const hours = sortedRoots.slice(1).map((r, i) => Math.abs(toTime(r.entry) - toTime(sortedRoots[i].entry)) / HOUR_MS)
    const positive = hours.filter((h) => h > 0)
    const minHours = positive.length ? Math.min(...positive) : 1
    const budgets = hours.map((h) => segmentBudget(h, minHours))
    const freeCols = GRID_COLS - 2 * GRID_MARGIN
    const gaps = budgets.map((b) => Math.max(GRID_CLUSTER_GAP, Math.ceil((b * 2 * (FILL_PX / cell) ** 2) / freeCols)))

    const packs = sortedRoots.map((r) => clusterFor(r, cell))
    const gridRows = GRID_TOP + packs.reduce((s, p) => s + p.height, 0) + gaps.reduce((s, g) => s + g, 0) + GRID_BOTTOM

    const rows: RowLayout[] = []
    const links: Link[] = []
    const blocked: Rect[] = []
    let bottom = gridRows - GRID_BOTTOM
    for (let i = 0; i < N; i++) {
      const pack = packs[i]
      const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right'
      const top = bottom - pack.height
      const innerEdge = side === 'left' ? GRID_MARGIN + pack.width : GRID_COLS - GRID_MARGIN - pack.width
      const colOf = (c: number, span: number) => (side === 'left' ? innerEdge - c - span : innerEdge + c)
      const xOf = (x: number) => (side === 'left' ? innerEdge - x : innerEdge + x)
      const anchorCol = side === 'left' ? innerEdge + ANCHOR_GAP : innerEdge - ANCHOR_GAP
      const anchorX = anchorCol * cell
      const rootPlaced = pack.placed[0]
      const anchorY = (top + rootPlaced.row + rootPlaced.rows / 2) * cell
      const boxes: NodeBox[] = pack.placed.map((p, k) => {
        const col = colOf(p.col, p.cols)
        const row = top + p.row
        const box: NodeBox = {
          entry: p.node.entry,
          depth: p.node.depth,
          variant: p.variant,
          col,
          row,
          cols: p.cols,
          rows: p.rows,
          x: col * cell,
          y: row * cell,
          w: p.cols * cell,
          h: p.rows * cell,
          date: toTime(p.node.entry)
        }
        if (k === 0) {
          box.anchorSide = side
          box.anchorX = anchorX
          box.anchorY = anchorY
        }
        blocked.push({ x: box.x - cell / 2, y: box.y - cell / 2, w: box.w + cell, h: box.h + cell })
        return box
      })
      const root = boxes[0]
      const laneX0 = side === 'left' ? root.x + root.w : anchorX + cell
      const laneX1 = side === 'left' ? anchorX - cell : root.x
      blocked.push({ x: laneX0, y: anchorY - cell, w: Math.max(0, laneX1 - laneX0), h: 2 * cell })
      for (const l of pack.links) {
        const pts = l.points.map((p) => ({ x: xOf(p.x) * cell, y: (top + p.y) * cell }))
        const a = pts[0]
        const b = pts[pts.length - 1]
        const len = Math.hypot(b.x - a.x, b.y - a.y)
        if (pts.length <= 4 && len < cell * 8) {
          const bow = (seeded(l.id) > 0.5 ? 1 : -1) * len * 0.35
          const mx = (a.x + b.x) / 2 - ((b.y - a.y) / (len || 1)) * bow
          const my = (a.y + b.y) / 2 + ((b.x - a.x) / (len || 1)) * bow
          links.push({ id: l.id, d: `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}` })
        } else links.push({ id: l.id, d: buildSpineHermite(pts) })
      }
      rows.push({
        rootEntry: sortedRoots[i].entry,
        side,
        boxes,
        top: root.y,
        cellSide: root.h,
        issueCellX: root.x,
        pathCellX: 0,
        pathCenterX: w / 2,
        rowMid: anchorY,
        gapAfter: i < N - 1 ? gaps[i] * cell : 0,
        spineAnchorX: anchorX,
        spineAnchorY: anchorY
      })
      bottom = top - (i < N - 1 ? gaps[i] : 0)
    }
    return { rows, links, blocked, budgets, cell, gridRows, totalH: gridRows * cell }
  }

  interface SpineAnchor {
    box: NodeBox
    x: number
    y: number
    side: 1 | -1
    date: number
  }

  function computeSpineAnchors(rows: RowLayout[], _w: number): SpineAnchor[] {
    const boxes: NodeBox[] = []
    for (const r of rows) for (const b of r.boxes) {
      if (b.depth === 0) boxes.push(b)
    }
    boxes.sort((a, b) => (a.date ?? 0) - (b.date ?? 0))
    return boxes.map((b) => ({
      box: b,
      x: b.anchorX ?? b.x,
      y: b.anchorY ?? b.y + b.h / 2,
      side: b.anchorSide === 'right' ? -1 : 1,
      date: b.date ?? 0
    }))
  }

  function fillingPath(
    start: { x: number; y: number },
    end: { x: number; y: number },
    box: { x: number; y: number; w: number; h: number },
    blockedRects: { x: number; y: number; w: number; h: number }[],
    budget: number,
    seed: number
  ): { x: number; y: number }[] {
    let s = seed >>> 0
    const rng = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0
      return s / 4294967296
    }
    const cell = FILL_PX
    const cols = Math.max(3, Math.round(box.w / cell))
    const rows = Math.max(3, Math.round(box.h / cell))
    const cw = box.w / cols
    const ch = box.h / rows
    const pt = (c: number, r: number) => ({ x: box.x + (c + 0.5) * cw, y: box.y + (r + 0.5) * ch })
    const inGrid = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows
    const blockedCells = new Uint8Array(cols * rows)
    for (const R of blockedRects) {
      const c0 = Math.max(0, Math.ceil((R.x - cw * 0.5 - box.x) / cw - 0.5))
      const c1 = Math.min(cols - 1, Math.floor((R.x + R.w + cw * 0.5 - box.x) / cw - 0.5))
      const r0 = Math.max(0, Math.ceil((R.y - ch * 0.5 - box.y) / ch - 0.5))
      const r1 = Math.min(rows - 1, Math.floor((R.y + R.h + ch * 0.5 - box.y) / ch - 0.5))
      for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) blockedCells[c * rows + r] = 1
    }
    const blocked = (c: number, r: number) => blockedCells[c * rows + r] === 1
    const key2 = (c: number, r: number) => c * rows + r
    const room = new Int32Array(cols * rows).fill(-1)
    const roomQueue: number[] = []
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        if (blocked(c, r) || c === 0 || r === 0 || c === cols - 1 || r === rows - 1) {
          room[key2(c, r)] = blocked(c, r) ? 0 : 1
          roomQueue.push(key2(c, r))
        }
      }
    for (let qi = 0; qi < roomQueue.length; qi++) {
      const cur = roomQueue[qi]
      const c = Math.floor(cur / rows)
      const r = cur % rows
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc
        const nr = r + dr
        if (!inGrid(nc, nr) || room[key2(nc, nr)] >= 0) continue
        room[key2(nc, nr)] = room[cur] + 1
        roomQueue.push(key2(nc, nr))
      }
    }
    let maxRoom = 1
    for (let k = 0; k < room.length; k++) if (room[k] > maxRoom) maxRoom = room[k]
    const snap = (p: { x: number; y: number }) => {
      let bc = 0
      let br = 0
      let bd = Infinity
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) {
          if (blocked(c, r)) continue
          const q = pt(c, r)
          const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2
          if (d < bd) {
            bd = d
            bc = c
            br = r
          }
        }
      return { c: bc, r: br }
    }
    const E = snap(end)
    const S = snap(start)
    const key = (c: number, r: number) => c * 1000 + r
    let freeCount = 0
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (!blocked(c, r)) freeCount++
    let L = Math.max(2, Math.min(Math.round(budget), Math.floor(freeCount * 0.5)))
    const baseMan = Math.abs(S.c - E.c) + Math.abs(S.r - E.r)
    while (L > 2 && (L - 1 - baseMan < 0 || (L - 1 - baseMan) % 2 !== 0)) L--
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]
    const visited = new Set<number>()
    let iters = 0
    const CAP = 1500
    const dfs = (c: number, r: number, len: number): { c: number; r: number }[] | null => {
      if (iters++ > CAP) return null
      if (len === L) return c === E.c && r === E.r ? [{ c, r }] : null
      if (c === E.c && r === E.r) return null
      const rem = L - len
      const d = Math.abs(c - E.c) + Math.abs(r - E.r)
      if (d > rem || (rem - d) % 2 !== 0) return null
      visited.add(key(c, r))
      const nbs = dirs
        .map(([dc, dr]) => [c + dc, r + dr])
        .filter(([nc, nr]) => inGrid(nc, nr) && !blocked(nc, nr) && !visited.has(key(nc, nr)))
        .map(([nc, nr]) => ({ nc, nr, w: rng() - room[key2(nc, nr)] / maxRoom }))
        .sort((p, q) => p.w - q.w)
        .map(({ nc, nr }) => [nc, nr])
      for (const [nc, nr] of nbs) {
        const sub = dfs(nc, nr, len + 1)
        if (sub) {
          visited.delete(key(c, r))
          return [{ c, r }, ...sub]
        }
      }
      visited.delete(key(c, r))
      return null
    }
    let route = dfs(S.c, S.r, 1)
    let tries = 0
    while (!route && L > 2 && tries < 5) {
      L -= Math.max(2, 2 * Math.floor(L / 16))
      iters = 0
      visited.clear()
      route = dfs(S.c, S.r, 1)
      tries++
    }
    if (!route) {
      const from = new Int32Array(cols * rows).fill(-1)
      const queue = [key2(S.c, S.r)]
      from[queue[0]] = queue[0]
      for (let qi = 0; qi < queue.length; qi++) {
        const cur = queue[qi]
        if (cur === key2(E.c, E.r)) break
        const c = Math.floor(cur / rows)
        const r = cur % rows
        for (const [dc, dr] of dirs) {
          const nc = c + dc
          const nr = r + dr
          if (!inGrid(nc, nr) || blocked(nc, nr)) continue
          const nk = key2(nc, nr)
          if (from[nk] >= 0) continue
          from[nk] = cur
          queue.push(nk)
        }
      }
      route = []
      if (from[key2(E.c, E.r)] >= 0) {
        for (let k = key2(E.c, E.r); ; k = from[k]) {
          route.unshift({ c: Math.floor(k / rows), r: k % rows })
          if (k === from[k]) break
        }
      } else route = [{ c: S.c, r: S.r }, { c: E.c, r: E.r }]
    }
    const grid = route.map((n) => pt(n.c, n.r))
    grid[0] = start
    grid[grid.length - 1] = end
    const corners = [grid[0]]
    for (let i = 1; i < grid.length - 1; i++) {
      const a = grid[i - 1]
      const b = grid[i]
      const c = grid[i + 1]
      const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
      if (Math.abs(cross) > 1e-6) corners.push(b)
    }
    corners.push(grid[grid.length - 1])
    const np = [corners[0]]
    for (let i = 0; i < corners.length - 1; i++) {
      const a = corners[i]
      const b = corners[i + 1]
      np.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 })
      np.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 })
    }
    np.push(corners[corners.length - 1])
    return np
  }

  function buildSpinePath(track: TrackLayout, w: number, trackH: number): string {
    const rows = track.rows
    if (!rows.length || w <= 0 || trackH <= 0) return ''
    const anchors = computeSpineAnchors(rows, w)
    if (anchors.length === 0) return ''

    if (narrow) {
      const x = anchors[0].x
      const top = anchors[anchors.length - 1]
      const topY = Math.max(40, top.y - 92) - 8
      const cx = w / 2
      const joinY = anchors[0].y
      const dy = (trackH - joinY) * 0.5
      return (
        `M ${cx.toFixed(2)} ${trackH.toFixed(2)} ` +
        `C ${cx.toFixed(2)} ${(trackH - dy).toFixed(2)}, ${x.toFixed(2)} ${(joinY + dy).toFixed(2)}, ${x.toFixed(2)} ${joinY.toFixed(2)} ` +
        `L ${x.toFixed(2)} ${topY.toFixed(2)}`
      )
    }

    const HOUR_MS = 3600000
    let minHours = Infinity
    for (let i = 0; i < anchors.length - 1; i++) {
      const h = Math.abs((anchors[i + 1].date ?? 0) - (anchors[i].date ?? 0)) / HOUR_MS
      if (h > 0 && h < minHours) minHours = h
    }
    if (!Number.isFinite(minHours)) minHours = 1
    const BASELINE_CELLS = 9
    const LARGER = 1.5

    const segs: { x: number; y: number }[][] = []
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i]
      const b = anchors[i + 1]
      const hours = Math.abs((b.date ?? 0) - (a.date ?? 0)) / HOUR_MS
      const top = Math.min(a.y, b.y)
      const box = { x: 0, y: top, w, h: Math.abs(a.y - b.y) }
      const budget = Math.max(BASELINE_CELLS, Math.round(LARGER * BASELINE_CELLS * (hours / minHours)))
      const seed = (1013904223 + i * 2654435761) >>> 0
      segs.push(fillingPath({ x: a.x, y: a.y }, { x: b.x, y: b.y }, box, track.blocked, budget, seed))
    }

    const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y)
    const lerp = (p: { x: number; y: number }, q: { x: number; y: number }, t: number) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t })
    const segLen = (poly: { x: number; y: number }[]) => {
      let L = 0
      for (let k = 1; k < poly.length; k++) L += dist(poly[k], poly[k - 1])
      return L
    }
    const arcPoint = (poly: { x: number; y: number }[], fromStart: boolean, D: number) => {
      if (poly.length < 2) return { pt: poly[0], idx: 0 }
      if (fromStart) {
        let acc = 0
        for (let k = 1; k < poly.length; k++) {
          const s = dist(poly[k], poly[k - 1])
          if (acc + s >= D) return { pt: lerp(poly[k - 1], poly[k], s ? (D - acc) / s : 0), idx: k }
          acc += s
        }
        return { pt: poly[poly.length - 1], idx: poly.length - 1 }
      }
      let acc = 0
      for (let k = poly.length - 2; k >= 0; k--) {
        const s = dist(poly[k + 1], poly[k])
        if (acc + s >= D) return { pt: lerp(poly[k + 1], poly[k], s ? (D - acc) / s : 0), idx: k }
        acc += s
      }
      return { pt: poly[0], idx: 0 }
    }

    const lens = segs.map(segLen)
    const GUIDE = 34
    const MAX_TURN = Math.cos((75 * Math.PI) / 180)
    const dAt = (i: number) => Math.min(GUIDE, Math.max(6, lens[i] * 0.42))
    const planet = { x: w / 2, y: trackH }

    const pts: { x: number; y: number }[] = []
    pts.push(planet)

    const N = anchors.length
    for (let i = 0; i < N; i++) {
      const A = { x: anchors[i].x, y: anchors[i].y }
      const dBefore = i > 0 ? dAt(i - 1) : Math.min(GUIDE, dist(A, planet) * 0.4)
      const dAfter = i < N - 1 ? dAt(i) : 40
      const below = { x: A.x, y: A.y + dBefore }
      const above = { x: A.x, y: A.y - dAfter }
      pts.push(below, A, above)
      if (i < N - 1) {
        const seg = segs[i]
        const next = anchors[i + 1]
        const nextBelow = { x: next.x, y: next.y + dAt(i) }
        const sharp = (from: { x: number; y: number }, to: { x: number; y: number }, dirY: number) => {
          const dx = to.x - from.x
          const dy = to.y - from.y
          const m = Math.hypot(dx, dy)
          return m > 0 && (dy * dirY) / m < MAX_TURN
        }
        let startIdx = arcPoint(seg, true, dAt(i)).idx
        let endIdx = arcPoint(seg, false, dAt(i)).idx
        for (let k = 0; k < 6 && startIdx < endIdx && sharp(above, seg[startIdx], -1); k++) startIdx++
        for (let k = 0; k < 6 && endIdx > startIdx && sharp(seg[endIdx], nextBelow, -1); k++) endIdx--
        for (let k = startIdx; k <= endIdx; k++) pts.push(segs[i][k])
      }
    }

    const last = anchors[N - 1]
    pts.push({ x: last.x, y: Math.max(40, last.y - 92) - 8 })
    return buildSpineHermite(pts)
  }

  function buildSpineConnectors(rows: RowLayout[], w: number): { id: string; d: string; cx: number; cy: number }[] {
    const anchors = computeSpineAnchors(rows, w)
    if (anchors.length === 0) return []

    return anchors.map((a) => {
      const box = a.box
      const startX = a.side === 1 ? box.x + box.w : box.x
      const startY = a.y
      const d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${a.x.toFixed(1)} ${a.y.toFixed(1)}`
      return { id: box.entry.href + ':conn', d, cx: a.x, cy: a.y }
    })
  }

  function buildSpineHermite(points: { x: number; y: number }[]): string {
    const dedup: { x: number; y: number }[] = []
    for (const p of points) {
      const last = dedup[dedup.length - 1]
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1) dedup.push(p)
    }
    const n = dedup.length
    if (n < 2) return n === 1 ? `M ${dedup[0].x.toFixed(2)} ${dedup[0].y.toFixed(2)}` : ''
    const alpha = 0.5
    let d = `M ${dedup[0].x.toFixed(2)} ${dedup[0].y.toFixed(2)} `
    for (let i = 0; i < n - 1; i++) {
      const p0 = dedup[Math.max(0, i - 1)]
      const p1 = dedup[i]
      const p2 = dedup[i + 1]
      const p3 = dedup[Math.min(n - 1, i + 2)]
      const d01 = Math.pow(Math.hypot(p1.x - p0.x, p1.y - p0.y), alpha) || 1
      const d12 = Math.pow(Math.hypot(p2.x - p1.x, p2.y - p1.y), alpha) || 1
      const d23 = Math.pow(Math.hypot(p3.x - p2.x, p3.y - p2.y), alpha) || 1
      const c1x = p1.x + ((p2.x - p0.x) * d12) / (3 * (d01 + d12))
      const c1y = p1.y + ((p2.y - p0.y) * d12) / (3 * (d01 + d12))
      const c2x = p2.x - ((p3.x - p1.x) * d12) / (3 * (d12 + d23))
      const c2y = p2.y - ((p3.y - p1.y) * d12) / (3 * (d12 + d23))
      d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `
    }
    return d
  }

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

  function computeBounds(list: RoadmapEntry[]): { start: number; end: number } {
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

  function flattenTree(roots: TreeNode[]): TreeNode[] {
    const out: TreeNode[] = []
    function walk(n: TreeNode) {
      out.push(n)
      n.children.forEach(walk)
    }
    roots.forEach(walk)
    return out
  }

  function findActiveHover(roots: TreeNode[], href: string | null): RoadmapEntry | null {
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

  function onNodeEnter(entry: RoadmapEntry, _side: 'left' | 'right', ev: Event) {
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

  function onNodeClick(entry: RoadmapEntry, e: MouseEvent) {
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

  function onRocketClick() {
    if (changelogHref) navigate(withBase(changelogHref))
  }

  function measure() {
    if (!track) return
    trackHeight = track.offsetHeight
    trackWidth = track.offsetWidth
    narrow = typeof window !== 'undefined' && window.innerWidth <= 800
  }

  function measureLength() {
    if (!spinePathEl) return
    totalLength = spinePathEl.getTotalLength()
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
      <button class="np-roadmap-travel" type="button" onclick={travel}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 2 L 14 8 L 4 14 Z" fill="currentColor" />
        </svg>
        <span>Travel</span>
      </button>
      {#if page.frontmatter.description}
        <p class="np-roadmap-hero-tagline">{page.frontmatter.description}</p>
      {/if}
      {#if page.html}
        <div class="np-roadmap-hero-body np-prose">{@html page.html}</div>
      {/if}
    </section>

    <div
      class="np-roadmap-track"
      bind:this={track}
      style:--np-rm-cols={GRID_COLS}
      style:--np-rm-rows={Math.max(1, layout.gridRows)}
    >
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

      {#each layout.rows as r (r.rootEntry.href)}
        {#each r.boxes as b (b.entry.href)}
          <RoadmapNode
            entry={b.entry}
            variant={b.variant}
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

    <div class="np-roadmap-planet">
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
  .np-roadmap-travel {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: start;
    justify-self: end;
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
