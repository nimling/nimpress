import type { RoadmapCard } from '../types'

export const GRID_COLS = 96
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

export type NodeVariant = 'card' | 'compact' | 'small' | 'pill'

const TIERS: NodeVariant[] = ['compact', 'small', 'pill']

export interface TreeNode {
  entry: RoadmapCard
  depth: number
  children: TreeNode[]
}

export interface NodeBox {
  entry: RoadmapCard
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

export interface RowLayout {
  rootEntry: RoadmapCard
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

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Link {
  id: string
  d: string
}

export interface TrackLayout {
  rows: RowLayout[]
  links: Link[]
  blocked: Rect[]
  budgets: number[]
  cell: number
  gridRows: number
  totalH: number
}

export function buildTree(list: RoadmapCard[]): TreeNode[] {
  const byHref = new Map(list.map((e) => [e.href, e]))
  const childMap = new Map<string, RoadmapCard[]>()
  for (const e of list) {
    if (e.parent && byHref.has(e.parent)) {
      const arr = childMap.get(e.parent) ?? []
      arr.push(e)
      childMap.set(e.parent, arr)
    }
  }
  function build(entry: RoadmapCard, depth: number, seen: Set<string>): TreeNode {
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


export const FONT = {
  head: 0.85,
  smallHead: 0.72,
  title: 1.5,
  compactTitle: 1.2,
  smallTitle: 1.05,
  desc: 1.1,
  pillTitle: 1.05,
  pillDate: 0.75,
  gap: 0.35
}

function contentRows(entry: RoadmapCard, variant: NodeVariant, cols: number, cell: number): number {
  const textW = cols * cell * BLOB_TEXT_SHARE
  const lines = (text: string, font: number, max: number) => Math.max(1, Math.min(max, Math.ceil((text.length * font * 0.55) / textW)))
  let h: number
  if (variant === 'pill') {
    h = (FONT.pillDate * 1.3 + FONT.gap + FONT.pillTitle * 1.1) * cell
  } else {
    const head = (variant === 'small' ? FONT.smallHead : FONT.head) * cell
    const title = (variant === 'card' ? FONT.title : variant === 'compact' ? FONT.compactTitle : FONT.smallTitle) * cell
    h = head * 1.7 + FONT.gap * cell + lines(entry.title, title, variant === 'small' ? 1 : 2) * title * 1.25
    if (variant === 'card' && entry.description) {
      const desc = FONT.desc * cell
      h += FONT.gap * cell + lines(entry.description, desc, 3) * desc * 1.45
    }
  }
  return Math.ceil(h / BLOB_TEXT_SHARE / cell) + 1
}

function rootCellsFor(root: TreeNode, cell: number): [number, number][] {
  const major = root.children.length || root.entry.kind === 'epic' || root.entry.kind === 'milestone'
  return (major ? [32, 28, 24, 20] : [24, 20, 18]).map((cols) => [cols, contentRows(root.entry, 'card', cols, cell)])
}

function childCellsFor(node: TreeNode, variant: NodeVariant, cell: number): [number, number] {
  const titleFont = (variant === 'compact' ? FONT.compactTitle : variant === 'small' ? FONT.smallTitle : FONT.pillTitle) * cell
  const dateFont = (variant === 'small' ? FONT.smallHead : variant === 'pill' ? FONT.pillDate : FONT.head) * cell
  const textPx = Math.max(node.entry.title.length * titleFont * 0.55, 10 * dateFont * 0.62) + cell
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

export function toTime(e: RoadmapCard): number {
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

export function layoutTrackNarrow(roots: TreeNode[], w: number): TrackLayout {
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

function layoutTrackStraight(roots: TreeNode[], w: number): TrackLayout {
  const cell = w / GRID_COLS
  const spineCol = GRID_COLS / 2
  const maxCols = spineCol - GRID_MARGIN - ANCHOR_GAP
  const colGap = 2
  const kidGap = 3
  const fit = (px: number, min: number, max: number) => Math.max(min, Math.min(max, Math.ceil(px / BLOB_TEXT_SHARE / cell) + 2))
  const sorted = [...roots].sort((a, b) => toTime(a.entry) - toTime(b.entry))
  const blocks = sorted.map((root) => {
    const nodes = flattenTree(root.children).sort((a, b) => toTime(b.entry) - toTime(a.entry))
    const colCols = nodes.reduce((m, n) => Math.max(m, fit(Math.max(n.entry.title.length * FONT.smallTitle * cell * 0.55, 10 * FONT.smallHead * cell * 0.62), 14, maxCols)), 14)
    const count = Math.max(1, Math.min(nodes.length, Math.floor((maxCols + colGap) / (colCols + colGap))))
    const spanCols = nodes.length ? count * colCols + (count - 1) * colGap : 0
    const textPx = Math.max(root.entry.title.length * FONT.title * cell * 0.55, ((root.entry.description ?? '').length * FONT.desc * cell * 0.52) / 2, 10 * cell)
    const rootCols = Math.min(maxCols, Math.max(fit(textPx, 16, maxCols), spanCols))
    const rootRows = contentRows(root.entry, 'card', rootCols, cell)
    const heights = Array(count).fill(0)
    const kids = nodes.map((node) => {
      const rows = contentRows(node.entry, 'small', colCols, cell)
      let column = 0
      for (let c = 1; c < count; c++) if (heights[c] < heights[column]) column = c
      const offset = heights[column]
      heights[column] += rows + kidGap
      return { node, rows, column, offset }
    })
    const height = rootRows + (nodes.length ? kidGap + Math.max(...heights) - kidGap : 0)
    return { root, rootCols, rootRows, colCols, kids, height }
  })
  const gridRows = GRID_TOP + blocks.reduce((s, b) => s + b.height, 0) + Math.max(0, blocks.length - 1) * GRID_CLUSTER_GAP + GRID_BOTTOM
  const rows: RowLayout[] = []
  const links: Link[] = []
  let bottom = gridRows - GRID_BOTTOM
  blocks.forEach((block, i) => {
    const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right'
    const top = bottom - block.height
    const innerEdge = side === 'left' ? spineCol - ANCHOR_GAP : spineCol + ANCHOR_GAP
    const rootCol = side === 'left' ? innerEdge - block.rootCols : innerEdge
    const box = (entry: RoadmapCard, depth: number, variant: NodeVariant, col: number, row: number, cols: number, span: number): NodeBox => ({
      entry,
      depth,
      variant,
      col,
      row,
      cols,
      rows: span,
      x: col * cell,
      y: row * cell,
      w: cols * cell,
      h: span * cell,
      date: toTime(entry)
    })
    const root = box(block.root.entry, 0, 'card', rootCol, top, block.rootCols, block.rootRows)
    root.anchorSide = side
    root.anchorX = spineCol * cell
    root.anchorY = root.y + root.h / 2
    const boxes = [root]
    const above = new Map<number, NodeBox>()
    const kidTop = top + block.rootRows + 3
    for (const k of block.kids) {
      const colCol = side === 'left'
        ? innerEdge - (k.column + 1) * block.colCols - k.column * colGap
        : innerEdge + k.column * (block.colCols + colGap)
      const kid = box(k.node.entry, k.node.depth, 'small', colCol, kidTop + k.offset, block.colCols, k.rows)
      boxes.push(kid)
      const x = kid.x + kid.w / 2
      const from = above.get(k.column)
      const y0 = from ? from.y + from.h : root.y + root.h
      links.push({
        id: `${block.root.entry.href}->${k.node.entry.href}`,
        d: `M ${x.toFixed(1)} ${y0.toFixed(1)} L ${x.toFixed(1)} ${kid.y.toFixed(1)}`
      })
      above.set(k.column, kid)
    }
    rows.push({
      rootEntry: block.root.entry,
      side,
      boxes,
      top: root.y,
      cellSide: root.h,
      issueCellX: root.x,
      pathCellX: 0,
      pathCenterX: root.anchorX,
      rowMid: root.anchorY,
      gapAfter: 0,
      spineAnchorX: root.anchorX,
      spineAnchorY: root.anchorY
    })
    bottom = top - GRID_CLUSTER_GAP
  })
  return { rows, links, blocked: [], budgets: [], cell, gridRows, totalH: gridRows * cell }
}

function layoutTrack(roots: TreeNode[], w: number, mode: RoadmapMode): TrackLayout {
  const cell = w / GRID_COLS
  if (roots.length === 0) return { rows: [], links: [], blocked: [], budgets: [], cell, gridRows: 0, totalH: 0 }
  if (mode === 'straight') return layoutTrackStraight(roots, w)

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

export function computeSpineAnchors(rows: RowLayout[], _w: number): SpineAnchor[] {
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

export function buildSpinePath(track: TrackLayout, w: number, trackH: number, straight: boolean): string {
  const rows = track.rows
  if (!rows.length || w <= 0 || trackH <= 0) return ''
  const anchors = computeSpineAnchors(rows, w)
  if (anchors.length === 0) return ''

  if (straight) {
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

export function buildSpineConnectors(rows: RowLayout[], w: number): { id: string; d: string; cx: number; cy: number }[] {
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

export function flattenTree(roots: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = []
  function walk(n: TreeNode) {
    out.push(n)
    n.children.forEach(walk)
  }
  roots.forEach(walk)
  return out
}

export type RoadmapMode = 'organic' | 'straight'

export interface RoadmapLayoutBox {
  href: string
  depth: number
  variant: NodeVariant
  col: number
  row: number
  cols: number
  rows: number
  anchorSide?: 'left' | 'right'
  anchorX?: number
  anchorY?: number
}

export interface RoadmapLayoutView {
  gridRows: number
  rows: { href: string; side: 'left' | 'right'; boxes: RoadmapLayoutBox[] }[]
  links: Link[]
  spine: string
  anchorLens: number[]
}

export type RoadmapLayout = Record<RoadmapMode, RoadmapLayoutView>

const REF_CELL = 12

export function scalePath(d: string, k: number): string {
  return d.replace(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g, (n) => (Number(n) * k).toFixed(2))
}

function pathSamples(d: string): { x: number; y: number; len: number }[] {
  const tokens = d.match(/[MLQC]|-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []
  const out: { x: number; y: number; len: number }[] = []
  let i = 0
  let cx = 0
  let cy = 0
  let len = 0
  const num = () => Number(tokens[i++])
  const push = (x: number, y: number) => {
    if (out.length) len += Math.hypot(x - cx, y - cy)
    out.push({ x, y, len })
    cx = x
    cy = y
  }
  while (i < tokens.length) {
    const cmd = tokens[i++]
    if (cmd === 'M' || cmd === 'L') push(num(), num())
    else if (cmd === 'Q') {
      const [x1, y1, x, y] = [num(), num(), num(), num()]
      const [x0, y0] = [cx, cy]
      for (let s = 1; s <= 16; s++) {
        const t = s / 16
        const u = 1 - t
        push(u * u * x0 + 2 * u * t * x1 + t * t * x, u * u * y0 + 2 * u * t * y1 + t * t * y)
      }
    } else if (cmd === 'C') {
      const [x1, y1, x2, y2, x, y] = [num(), num(), num(), num(), num(), num()]
      const [x0, y0] = [cx, cy]
      for (let s = 1; s <= 16; s++) {
        const t = s / 16
        const u = 1 - t
        push(
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y
        )
      }
    }
  }
  return out
}

function anchorLengths(d: string, anchors: SpineAnchor[]): number[] {
  const samples = pathSamples(d)
  const lens: number[] = []
  let from = 0
  for (const a of anchors) {
    let best = from
    let bestD = Infinity
    for (let k = from; k < samples.length; k++) {
      const dd = (samples[k].x - a.x) ** 2 + (samples[k].y - a.y) ** 2
      if (dd < bestD) {
        bestD = dd
        best = k
      }
    }
    lens.push(samples[best]?.len ?? 0)
    from = best
  }
  return lens
}

function layoutView(entries: RoadmapCard[], mode: RoadmapMode): RoadmapLayoutView {
  const w = GRID_COLS * REF_CELL
  const track = layoutTrack(buildTree(entries), w, mode)
  const spine = buildSpinePath(track, w, track.totalH, mode === 'straight')
  const anchors = computeSpineAnchors(track.rows, w)
  const k = 1 / REF_CELL
  return {
    gridRows: track.gridRows,
    rows: track.rows.map((r) => ({
      href: r.rootEntry.href,
      side: r.side,
      boxes: r.boxes.map((b) => ({
        href: b.entry.href,
        depth: b.depth,
        variant: b.variant,
        col: b.col,
        row: b.row,
        cols: b.cols,
        rows: b.rows,
        ...(b.anchorSide ? { anchorSide: b.anchorSide, anchorX: (b.anchorX ?? 0) * k, anchorY: (b.anchorY ?? 0) * k } : {})
      }))
    })),
    links: track.links.map((l) => ({ id: l.id, d: scalePath(l.d, k) })),
    spine: scalePath(spine, k),
    anchorLens: anchorLengths(spine, anchors).map((l) => l * k)
  }
}

export function buildRoadmapLayout(entries: RoadmapCard[]): RoadmapLayout {
  return { organic: layoutView(entries, 'organic'), straight: layoutView(entries, 'straight') }
}
