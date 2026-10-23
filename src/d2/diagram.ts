import { D2Error, parseD2, type D2Connection, type D2Graph, type D2Node } from './parse'

export { D2Error }

export type D2ShapeKind =
  | 'rectangle'
  | 'square'
  | 'page'
  | 'parallelogram'
  | 'document'
  | 'cylinder'
  | 'queue'
  | 'package'
  | 'step'
  | 'callout'
  | 'stored_data'
  | 'person'
  | 'diamond'
  | 'oval'
  | 'circle'
  | 'hexagon'
  | 'cloud'
  | 'text'
  | 'code'
  | 'sql_table'
  | 'class'
  | 'image'

export type D2Direction = 'down' | 'up' | 'right' | 'left'

export interface D2Style {
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeDash?: number
  radius?: number
  opacity?: number
  fontColor?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  shadow?: boolean
  multiple?: boolean
  doubleBorder?: boolean
  animated?: boolean
}

export interface D2Row {
  name: string
  type: string
  constraint: string
  y: number
}

export interface D2Shape {
  id: string
  kind: D2ShapeKind
  label: string[]
  x: number
  y: number
  width: number
  height: number
  container: boolean
  level: number
  outline: string
  inner: string
  labelX: number
  labelY: number
  fontSize: number
  headerHeight: number
  rows: D2Row[]
  rowInset: number
  icon: string
  iconX: number
  iconY: number
  iconSize: number
  link: string
  tooltip: string
  style: D2Style
}

export type D2ArrowheadKind =
  | 'none'
  | 'triangle'
  | 'arrow'
  | 'diamond'
  | 'circle'
  | 'box'
  | 'cross'
  | 'cf-one'
  | 'cf-many'
  | 'cf-one-required'
  | 'cf-many-required'

export interface D2Arrowhead {
  kind: D2ArrowheadKind
  filled: boolean
  label: string
}

export interface D2Edge {
  id: string
  path: string
  label: string[]
  labelX: number
  labelY: number
  labelWidth: number
  labelHeight: number
  fontSize: number
  source: D2Arrowhead
  target: D2Arrowhead
  style: D2Style
}

export interface D2Diagram {
  width: number
  height: number
  shapes: D2Shape[]
  edges: D2Edge[]
  files: string[]
}

interface Point {
  x: number
  y: number
}

interface Box {
  node: D2Node
  attrs: Record<string, string>
  kind: D2ShapeKind
  label: string[]
  style: D2Style
  fontSize: number
  children: Box[]
  parent: Box | null
  level: number
  rows: Array<{ id: string; name: string; type: string; constraint: string }>
  rowInset: number
  width: number
  height: number
  x: number
  y: number
  center: Map<string, Point>
  contentX: number
  contentY: number
  routes: Map<number, { points: Point[]; label: Point | null }>
  near: string
}

const FONT = 14
const CONTAINER_FONT = 15
const EDGE_FONT = 13
const LINE = 1.4
const PAD_X = 24
const PAD_Y = 14
const MIN_WIDTH = 72
const MIN_HEIGHT = 44
const NODE_SEP = 48
const DUMMY_SEP = 18
const RANK_SEP = 64
const CONTAINER_PAD = 28
const DIAGRAM_PAD = 24
const GRID_GAP = 32
const ROW_HEIGHT = 26
const HEADER_HEIGHT = 36
const ICON_SIZE = 24
const PERSON_HEIGHT = 72
const IMAGE_SIZE = 64
const PARALLEL_GAP = 24
const ORDER_PASSES = 24
const POSITION_PASSES = 8

const SHAPES = new Set<D2ShapeKind>([
  'rectangle',
  'square',
  'page',
  'parallelogram',
  'document',
  'cylinder',
  'queue',
  'package',
  'step',
  'callout',
  'stored_data',
  'person',
  'diamond',
  'oval',
  'circle',
  'hexagon',
  'cloud',
  'text',
  'code',
  'sql_table',
  'class',
  'image'
])

const ARROWHEADS = new Set<D2ArrowheadKind>([
  'none',
  'triangle',
  'arrow',
  'diamond',
  'circle',
  'box',
  'cross',
  'cf-one',
  'cf-many',
  'cf-one-required',
  'cf-many-required'
])

const NEAR = new Set(['top-left', 'top-center', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'])

const CONSTRAINTS: Record<string, string> = { primary_key: 'PK', foreign_key: 'FK', unique: 'UNQ' }

const NARROW = new Set("iljtfrI.,:;'!|()[] ")
const WIDE = new Set('mwMW@%')

const CLOUD =
  'M0.25,0.88 C0.08,0.88 0,0.72 0.07,0.58 C0,0.42 0.12,0.27 0.28,0.31 C0.32,0.12 0.56,0.06 0.66,0.22 C0.82,0.14 0.97,0.3 0.91,0.46 C1.02,0.56 0.98,0.86 0.8,0.88 Z'

export function textWidth(text: string, size: number, bold = false, mono = false): number {
  if (mono) return text.length * size * 0.6
  let units = 0
  for (const ch of text) units += NARROW.has(ch) ? 0.3 : WIDE.has(ch) ? 0.85 : ch >= 'A' && ch <= 'Z' ? 0.66 : 0.55
  return units * size * (bold ? 1.06 : 1)
}

function labelLines(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .trimEnd()
    )
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  return lines
}

function widest(lines: string[], size: number, bold = false, mono = false): number {
  return lines.reduce((max, line) => Math.max(max, textWidth(line, size, bold, mono)), 0)
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function flag(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined
  return value === 'true'
}

function number(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function styleOf(attrs: Record<string, string>): D2Style {
  const style: D2Style = {
    fill: attrs['style.fill'],
    stroke: attrs['style.stroke'],
    strokeWidth: number(attrs['style.stroke-width']),
    strokeDash: number(attrs['style.stroke-dash']),
    radius: number(attrs['style.border-radius']),
    opacity: number(attrs['style.opacity']),
    fontColor: attrs['style.font-color'],
    fontSize: number(attrs['style.font-size']),
    bold: flag(attrs['style.bold']),
    italic: flag(attrs['style.italic']),
    underline: flag(attrs['style.underline']),
    shadow: flag(attrs['style.shadow']),
    multiple: flag(attrs['style.multiple']),
    doubleBorder: flag(attrs['style.double-border']),
    animated: flag(attrs['style.animated'])
  }
  for (const key of Object.keys(style) as Array<keyof D2Style>) if (style[key] === undefined) delete style[key]
  return style
}

function mergedAttrs(graph: D2Graph, holder: { attrs: Record<string, string>; classes: string[] }): Record<string, string> {
  const merged: Record<string, string> = {}
  for (const name of holder.classes) Object.assign(merged, graph.classes.get(name)?.attrs ?? {})
  return Object.assign(merged, holder.attrs)
}

function classLabel(graph: D2Graph, classes: string[]): string | null {
  for (const name of [...classes].reverse()) {
    const label = graph.classes.get(name)?.label
    if (label != null) return label
  }
  return null
}

function kindOf(attrs: Record<string, string>): D2ShapeKind {
  const raw = (attrs.shape ?? 'rectangle').toLowerCase()
  return SHAPES.has(raw as D2ShapeKind) ? (raw as D2ShapeKind) : 'rectangle'
}

function directionOf(box: Box): D2Direction {
  let cursor: Box | null = box
  while (cursor && cursor.attrs.direction === undefined) cursor = cursor.parent
  const raw = cursor?.attrs.direction
  return raw === 'up' || raw === 'right' || raw === 'left' ? raw : 'down'
}

function tabular(kind: D2ShapeKind): boolean {
  return kind === 'sql_table' || kind === 'class'
}

function buildBoxes(graph: D2Graph): { root: Box; boxes: Map<string, Box>; owner: Map<string, Box> } {
  const children = new Map<string, D2Node[]>()
  for (const node of graph.nodes.values()) {
    if (node.id === '') continue
    const list = children.get(node.parent) ?? []
    list.push(node)
    children.set(node.parent, list)
  }
  for (const list of children.values()) list.sort((a, b) => a.order - b.order)
  const boxes = new Map<string, Box>()
  const owner = new Map<string, Box>()
  const make = (node: D2Node, parent: Box | null, level: number): Box => {
    const attrs = mergedAttrs(graph, node)
    const kind = node.id === '' ? 'rectangle' : kindOf(attrs)
    const style = styleOf(attrs)
    const container = node.id !== '' && !tabular(kind) && (children.get(node.id)?.length ?? 0) > 0
    const fontSize = style.fontSize ?? (container ? CONTAINER_FONT : FONT)
    const text = node.label ?? classLabel(graph, node.classes) ?? node.path[node.path.length - 1] ?? ''
    const box: Box = {
      node,
      attrs,
      kind,
      label: kind === 'image' && node.label == null ? [] : labelLines(text),
      style,
      fontSize,
      children: [],
      parent,
      level,
      rows: [],
      rowInset: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      center: new Map(),
      contentX: 0,
      contentY: 0,
      routes: new Map(),
      near: level === 1 && NEAR.has(attrs.near ?? '') ? attrs.near : ''
    }
    boxes.set(node.id, box)
    owner.set(node.id, box)
    if (tabular(kind)) {
      const claim = (id: string) => {
        owner.set(id, box)
        for (const child of children.get(id) ?? []) claim(child.id)
      }
      for (const row of children.get(node.id) ?? []) {
        const rowAttrs = mergedAttrs(graph, row)
        const constraint = (rowAttrs.constraint ?? '')
          .split(';')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => CONSTRAINTS[c] ?? c)
          .join(' ')
        box.rows.push({ id: row.id, name: row.path[row.path.length - 1], type: row.label ?? '', constraint })
        claim(row.id)
      }
    } else {
      box.children = (children.get(node.id) ?? []).map((child) => make(child, box, level + 1))
    }
    return box
  }
  const root = make(graph.nodes.get('')!, null, 0)
  return { root, boxes, owner }
}

function sizeLeaf(box: Box): void {
  const { kind, label, fontSize, style } = box
  const mono = kind === 'code'
  const bold = style.bold ?? false
  const lineHeight = fontSize * LINE
  const textW = widest(label, fontSize, bold, mono)
  const textH = label.length * lineHeight
  const icon = box.attrs.icon && kind !== 'image' ? ICON_SIZE + 12 : 0
  let width = Math.max(MIN_WIDTH, textW + 2 * PAD_X + icon)
  let height = Math.max(MIN_HEIGHT, textH + 2 * PAD_Y)
  switch (kind) {
    case 'text':
      width = textW + 8
      height = textH + 4
      break
    case 'code':
      width = textW + 32
      height = textH + 24
      break
    case 'sql_table':
    case 'class': {
      const names = box.rows.map((r) => textWidth(r.name, 13, false, true))
      const types = box.rows.map((r) => textWidth(r.type, 13, false, true))
      const constraints = box.rows.map((r) => (r.constraint ? textWidth(r.constraint, 10, true) + 16 : 0))
      box.rowInset = Math.ceil(Math.max(0, ...constraints))
      const body = Math.max(0, ...names) + Math.max(0, ...types) + Math.max(0, ...constraints) + 56
      width = Math.max(160, widest(label, fontSize, true) + 40, body)
      height = HEADER_HEIGHT + Math.max(1, box.rows.length) * ROW_HEIGHT
      break
    }
    case 'circle': {
      const side = Math.max(64, Math.hypot(textW, textH) + 2 * PAD_Y)
      width = side
      height = side
      break
    }
    case 'square': {
      const side = Math.max(width, height)
      width = side
      height = side
      break
    }
    case 'oval':
      width = Math.max(MIN_WIDTH, textW * 1.25 + 2 * PAD_X)
      height = Math.max(MIN_HEIGHT, textH * 1.3 + 2 * PAD_Y)
      break
    case 'diamond':
      width = Math.max(96, textW * 1.5 + 48)
      height = Math.max(64, textH * 1.5 + 40)
      break
    case 'hexagon':
    case 'step':
      width += 32
      break
    case 'parallelogram':
    case 'queue':
    case 'stored_data':
      width += 24
      break
    case 'cylinder':
      height += 24
      break
    case 'package':
    case 'callout':
      height += 14
      break
    case 'document':
      height += 12
      break
    case 'page':
      width += 12
      break
    case 'cloud':
      width = Math.max(96, (textW + 2 * PAD_X) * 1.4)
      height = Math.max(64, (textH + 2 * PAD_Y) * 1.55)
      break
    case 'person':
      width = Math.max(56, textW + 8)
      height = PERSON_HEIGHT + (textH ? textH + 8 : 0)
      break
    case 'image':
      width = Math.max(IMAGE_SIZE, textW + 8)
      height = IMAGE_SIZE + (textH ? textH + 8 : 0)
      break
  }
  box.width = Math.round(number(box.attrs.width) ?? width)
  box.height = Math.round(number(box.attrs.height) ?? height)
}

interface LayerItem {
  id: string
  width: number
  height: number
  dummy: boolean
}

interface LayoutEdge {
  key: number
  source: string
  target: string
  labelWidth: number
  labelHeight: number
}

interface LayoutResult {
  width: number
  height: number
  center: Map<string, Point>
  routes: Map<number, { points: Point[]; label: Point | null }>
}

function countCrossings(layers: string[][], down: Map<string, string[]>): number {
  let total = 0
  for (let r = 0; r + 1 < layers.length; r++) {
    const next = new Map(layers[r + 1].map((id, i) => [id, i]))
    const segments: Array<[number, number]> = []
    layers[r].forEach((id, i) => {
      for (const target of down.get(id) ?? []) segments.push([i, next.get(target)!])
    })
    for (let a = 0; a < segments.length; a++) {
      for (let b = a + 1; b < segments.length; b++) {
        if ((segments[a][0] - segments[b][0]) * (segments[a][1] - segments[b][1]) < 0) total++
      }
    }
  }
  return total
}

function placeLayer(items: LayerItem[], desired: number[]): number[] {
  const n = items.length
  const gap = (i: number) =>
    (items[i].width + items[i + 1].width) / 2 + (items[i].dummy || items[i + 1].dummy ? DUMMY_SEP : NODE_SEP)
  const right = [...desired]
  for (let i = 1; i < n; i++) right[i] = Math.max(desired[i], right[i - 1] + gap(i - 1))
  const left = [...desired]
  for (let i = n - 2; i >= 0; i--) left[i] = Math.min(desired[i], left[i + 1] - gap(i))
  return right.map((value, i) => (value + left[i]) / 2)
}

export function layered(nodes: Array<{ id: string; width: number; height: number }>, edges: LayoutEdge[], direction: D2Direction): LayoutResult {
  const horizontal = direction === 'right' || direction === 'left'
  const frame = (w: number, h: number) => (horizontal ? { width: h, height: w } : { width: w, height: h })
  const known = new Set(nodes.map((n) => n.id))
  const live = edges.filter((e) => e.source !== e.target && known.has(e.source) && known.has(e.target))

  const outgoing = new Map<string, LayoutEdge[]>(nodes.map((n) => [n.id, []]))
  for (const edge of live) outgoing.get(edge.source)!.push(edge)
  const state = new Map<string, number>()
  const reversed = new Set<LayoutEdge>()
  const visit = (id: string) => {
    state.set(id, 1)
    for (const edge of outgoing.get(id)!) {
      const seen = state.get(edge.target)
      if (seen === 1) reversed.add(edge)
      else if (!seen) visit(edge.target)
    }
    state.set(id, 2)
  }
  for (const node of nodes) if (!state.get(node.id)) visit(node.id)
  const ends = (edge: LayoutEdge): [string, string] => (reversed.has(edge) ? [edge.target, edge.source] : [edge.source, edge.target])

  const preds = new Map<string, string[]>(nodes.map((n) => [n.id, []]))
  const succs = new Map<string, string[]>(nodes.map((n) => [n.id, []]))
  for (const edge of live) {
    const [from, to] = ends(edge)
    succs.get(from)!.push(to)
    preds.get(to)!.push(from)
  }
  const indegree = new Map(nodes.map((n) => [n.id, preds.get(n.id)!.length]))
  const order: string[] = []
  const ready = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id)
  while (ready.length) {
    const id = ready.shift()!
    order.push(id)
    for (const next of succs.get(id)!) {
      indegree.set(next, indegree.get(next)! - 1)
      if (indegree.get(next) === 0) ready.push(next)
    }
  }
  const rank = new Map<string, number>()
  for (const id of order) rank.set(id, Math.max(0, ...preds.get(id)!.map((p) => rank.get(p)! + 1)))
  for (const id of [...order].reverse()) {
    if (preds.get(id)!.length || !succs.get(id)!.length) continue
    rank.set(id, Math.min(...succs.get(id)!.map((s) => rank.get(s)!)) - 1)
  }
  const lowest = Math.min(0, ...rank.values())
  for (const [id, value] of rank) rank.set(id, value - lowest)
  const depth = Math.max(0, ...rank.values()) + 1

  const items = new Map<string, LayerItem>()
  const layers: string[][] = Array.from({ length: depth }, () => [])
  for (const node of nodes) {
    items.set(node.id, { id: node.id, ...frame(node.width, node.height), dummy: false })
    layers[rank.get(node.id)!].push(node.id)
  }
  const down = new Map<string, string[]>()
  const up = new Map<string, string[]>()
  const link = (from: string, to: string) => {
    down.set(from, [...(down.get(from) ?? []), to])
    up.set(to, [...(up.get(to) ?? []), from])
  }
  const gapExtra = new Array<number>(depth).fill(0)
  const chains = new Map<LayoutEdge, { ids: string[]; label: string }>()
  for (const edge of live) {
    const [from, to] = ends(edge)
    const span = rank.get(to)! - rank.get(from)!
    const labelled = edge.labelWidth > 0
    const labelFrame = frame(edge.labelWidth, edge.labelHeight)
    const ids = [from]
    let labelId = ''
    const middle = Math.floor(span / 2)
    for (let k = 1; k < span; k++) {
      const id = `\u0000${edge.key}:${k}`
      const carries = labelled && k === middle
      rank.set(id, rank.get(from)! + k)
      items.set(id, { id, width: carries ? labelFrame.width : 8, height: carries ? labelFrame.height : 0, dummy: true })
      layers[rank.get(from)! + k].push(id)
      if (carries) labelId = id
      ids.push(id)
    }
    ids.push(to)
    for (let i = 0; i + 1 < ids.length; i++) link(ids[i], ids[i + 1])
    if (labelled && span === 1) gapExtra[rank.get(from)!] = Math.max(gapExtra[rank.get(from)!], labelFrame.height + 8)
    chains.set(edge, { ids, label: labelId })
  }

  const position = new Map<string, number>()
  const index = () => layers.forEach((layer) => layer.forEach((id, i) => position.set(id, i)))
  index()
  const barycenter = (id: string, neighbors: Map<string, string[]>) => {
    const list = neighbors.get(id) ?? []
    if (!list.length) return position.get(id)!
    return list.reduce((sum, n) => sum + position.get(n)!, 0) / list.length
  }
  let best = layers.map((layer) => [...layer])
  let bestCrossings = countCrossings(layers, down)
  for (let pass = 0; pass < ORDER_PASSES && bestCrossings > 0; pass++) {
    const downward = pass % 2 === 0
    const range = downward ? layers.map((_, r) => r).slice(1) : layers.map((_, r) => r).reverse().slice(1)
    for (const r of range) {
      const scores = new Map(layers[r].map((id) => [id, barycenter(id, downward ? up : down)]))
      layers[r].sort((a, b) => scores.get(a)! - scores.get(b)! || position.get(a)! - position.get(b)!)
      layers[r].forEach((id, i) => position.set(id, i))
    }
    const crossings = countCrossings(layers, down)
    if (crossings < bestCrossings) {
      bestCrossings = crossings
      best = layers.map((layer) => [...layer])
    }
  }
  best.forEach((layer, r) => (layers[r] = layer))
  index()

  const x = new Map<string, number>()
  for (const layer of layers) {
    const list = layer.map((id) => items.get(id)!)
    const packed = placeLayer(list, list.map(() => 0))
    layer.forEach((id, i) => x.set(id, packed[i]))
  }
  const average = (list: string[] | undefined) => (list?.length ? list.reduce((sum, id) => sum + x.get(id)!, 0) / list.length : undefined)
  for (let pass = 0; pass < POSITION_PASSES; pass++) {
    const range = pass % 2 === 0 ? layers.map((_, r) => r) : layers.map((_, r) => r).reverse()
    for (const r of range) {
      const list = layers[r].map((id) => items.get(id)!)
      const desired = layers[r].map((id) => {
        const near = [...(up.get(id) ?? []), ...(down.get(id) ?? [])]
        return average(near) ?? x.get(id)!
      })
      const placed = placeLayer(list, desired)
      layers[r].forEach((id, i) => x.set(id, placed[i]))
    }
  }

  const layerHeight = layers.map((layer) => Math.max(0, ...layer.map((id) => items.get(id)!.height)))
  const top: number[] = []
  let cursor = 0
  for (let r = 0; r < depth; r++) {
    top.push(cursor)
    cursor += layerHeight[r] + RANK_SEP + gapExtra[r]
  }
  const frameHeight = cursor - RANK_SEP - gapExtra[depth - 1]
  let minX = Infinity
  let maxX = -Infinity
  for (const [id, item] of items) {
    minX = Math.min(minX, x.get(id)! - item.width / 2)
    maxX = Math.max(maxX, x.get(id)! + item.width / 2)
  }
  if (!Number.isFinite(minX)) {
    minX = 0
    maxX = 0
  }
  const frameWidth = maxX - minX
  const framePoint = (id: string): Point => ({ x: x.get(id)! - minX, y: top[rank.get(id)!] + layerHeight[rank.get(id)!] / 2 })
  const toFinal = (p: Point): Point => {
    const flat = horizontal ? { x: p.y, y: p.x } : p
    const width = horizontal ? frameHeight : frameWidth
    const height = horizontal ? frameWidth : frameHeight
    return {
      x: direction === 'left' ? width - flat.x : flat.x,
      y: direction === 'up' ? height - flat.y : flat.y
    }
  }

  const center = new Map<string, Point>()
  for (const node of nodes) center.set(node.id, toFinal(framePoint(node.id)))
  const routes = new Map<number, { points: Point[]; label: Point | null }>()
  for (const [edge, chain] of chains) {
    const points = chain.ids.map((id) => toFinal(framePoint(id)))
    if (reversed.has(edge)) points.reverse()
    routes.set(edge.key, { points, label: chain.label ? toFinal(framePoint(chain.label)) : null })
  }
  return {
    width: horizontal ? frameHeight : frameWidth,
    height: horizontal ? frameWidth : frameHeight,
    center,
    routes
  }
}

function gridLayout(boxes: Box[], attrs: Record<string, string>): LayoutResult {
  const n = boxes.length
  const rowsAttr = number(attrs['grid-rows'])
  const columnsAttr = number(attrs['grid-columns'])
  const columns = columnsAttr ? Math.max(1, Math.round(columnsAttr)) : Math.ceil(n / Math.max(1, Math.round(rowsAttr ?? 1)))
  const rows = Math.ceil(n / columns)
  const columnMajor = !columnsAttr
  const cell = (i: number) => (columnMajor ? { r: i % rows, c: Math.floor(i / rows) } : { r: Math.floor(i / columns), c: i % columns })
  const gap = number(attrs['grid-gap']) ?? GRID_GAP
  const vertical = number(attrs['vertical-gap']) ?? gap
  const horizontalGap = number(attrs['horizontal-gap']) ?? gap
  const columnWidth = new Array<number>(columns).fill(0)
  const rowHeight = new Array<number>(rows).fill(0)
  boxes.forEach((box, i) => {
    const { r, c } = cell(i)
    columnWidth[c] = Math.max(columnWidth[c], box.width)
    rowHeight[r] = Math.max(rowHeight[r], box.height)
  })
  const left = columnWidth.map((_, c) => columnWidth.slice(0, c).reduce((s, w) => s + w + horizontalGap, 0))
  const topOf = rowHeight.map((_, r) => rowHeight.slice(0, r).reduce((s, h) => s + h + vertical, 0))
  const center = new Map<string, Point>()
  boxes.forEach((box, i) => {
    const { r, c } = cell(i)
    if (!box.children.length && !tabular(box.kind)) {
      box.width = columnWidth[c]
      box.height = rowHeight[r]
    }
    center.set(box.node.id, { x: left[c] + columnWidth[c] / 2, y: topOf[r] + rowHeight[r] / 2 })
  })
  return {
    width: columnWidth.reduce((s, w) => s + w, 0) + horizontalGap * Math.max(0, columns - 1),
    height: rowHeight.reduce((s, h) => s + h, 0) + vertical * Math.max(0, rows - 1),
    center,
    routes: new Map()
  }
}

function edgeLabelSize(connection: D2Connection): { width: number; height: number; lines: string[]; fontSize: number } {
  const lines = connection.label ? labelLines(connection.label) : []
  const fontSize = number(connection.attrs['style.font-size']) ?? EDGE_FONT
  if (!lines.length) return { width: 0, height: 0, lines, fontSize }
  return { width: widest(lines, fontSize) + 12, height: lines.length * fontSize * LINE + 6, lines, fontSize }
}

function ancestry(box: Box): Box[] {
  const chain: Box[] = []
  for (let cursor: Box | null = box; cursor; cursor = cursor.parent) chain.unshift(cursor)
  return chain
}

function assignEdges(graph: D2Graph, owner: Map<string, Box>): Map<Box, LayoutEdge[]> {
  const byContainer = new Map<Box, LayoutEdge[]>()
  graph.connections.forEach((connection, key) => {
    const source = owner.get(connection.source)
    const target = owner.get(connection.target)
    if (!source || !target || source === target) return
    const a = ancestry(source)
    const b = ancestry(target)
    let shared = 0
    while (shared < a.length && shared < b.length && a[shared] === b[shared]) shared++
    if (shared >= a.length || shared >= b.length) return
    const container = a[shared - 1]
    const size = edgeLabelSize(connection)
    const list = byContainer.get(container) ?? []
    list.push({ key, source: a[shared].node.id, target: b[shared].node.id, labelWidth: size.width, labelHeight: size.height })
    byContainer.set(container, list)
  })
  return byContainer
}

function sizeBox(box: Box, edges: Map<Box, LayoutEdge[]>): void {
  if (!box.children.length) {
    if (box.level > 0) sizeLeaf(box)
    return
  }
  for (const child of box.children) sizeBox(child, edges)
  const laid = box.children.filter((child) => !child.near)
  const grid = box.attrs['grid-rows'] !== undefined || box.attrs['grid-columns'] !== undefined
  const result = grid
    ? gridLayout(laid, box.attrs)
    : layered(
        laid.map((child) => ({ id: child.node.id, width: child.width, height: child.height })),
        edges.get(box) ?? [],
        directionOf(box)
      )
  box.center = result.center
  box.routes = result.routes
  if (box.level === 0) {
    box.contentX = 0
    box.contentY = 0
    box.width = result.width
    box.height = result.height
    return
  }
  const lineHeight = box.fontSize * LINE
  const header = box.label.length ? box.label.length * lineHeight + 20 : CONTAINER_PAD
  const labelWidth = widest(box.label, box.fontSize, true) + 2 * CONTAINER_PAD
  box.width = Math.round(Math.max(result.width + 2 * CONTAINER_PAD, labelWidth, number(box.attrs.width) ?? 0))
  box.height = Math.round(Math.max(result.height + header + CONTAINER_PAD, number(box.attrs.height) ?? 0))
  box.contentX = (box.width - result.width) / 2
  box.contentY = header
}

function placeBox(box: Box, x: number, y: number): void {
  box.x = x
  box.y = y
  for (const child of box.children) {
    if (child.near) continue
    const c = box.center.get(child.node.id)!
    placeBox(child, x + box.contentX + c.x - child.width / 2, y + box.contentY + c.y - child.height / 2)
  }
}

function placeNear(root: Box): void {
  for (const child of root.children) {
    if (!child.near) continue
    const [vertical, horizontal] = child.near.split('-')
    const x =
      vertical === 'center'
        ? horizontal === 'left'
          ? -child.width - GRID_GAP
          : root.width + GRID_GAP
        : horizontal === 'left'
          ? 0
          : horizontal === 'right'
            ? root.width - child.width
            : (root.width - child.width) / 2
    const y =
      vertical === 'top'
        ? -child.height - GRID_GAP
        : vertical === 'bottom'
          ? root.height + GRID_GAP
          : (root.height - child.height) / 2
    placeBox(child, x, y)
  }
}

function shapeBounds(box: Box): { x: number; y: number; width: number; height: number } {
  if (box.kind === 'person') return { x: box.x, y: box.y, width: box.width, height: PERSON_HEIGHT }
  if (box.kind === 'image') return { x: box.x + (box.width - IMAGE_SIZE) / 2, y: box.y, width: IMAGE_SIZE, height: IMAGE_SIZE }
  return box
}

function anchor(box: Box, endpoint: string): Point {
  const row = box.rows.findIndex((r) => r.id === endpoint || endpoint.startsWith(`${r.id}.`))
  if (row >= 0) return { x: box.x + box.width / 2, y: box.y + HEADER_HEIGHT + row * ROW_HEIGHT + ROW_HEIGHT / 2 }
  const bounds = shapeBounds(box)
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

function clip(box: Box, from: Point, toward: Point): Point {
  const b = shapeBounds(box)
  const cx = b.x + b.width / 2
  const cy = b.y + b.height / 2
  const dx = toward.x - from.x
  const dy = toward.y - from.y
  if (!dx && !dy) return from
  let t: number
  if (box.kind === 'circle' || box.kind === 'oval') {
    const rx = b.width / 2
    const ry = b.height / 2
    const ox = (from.x - cx) / rx
    const oy = (from.y - cy) / ry
    const vx = dx / rx
    const vy = dy / ry
    const a = vx * vx + vy * vy
    const half = ox * vx + oy * vy
    const c = ox * ox + oy * oy - 1
    t = (-half + Math.sqrt(Math.max(0, half * half - a * c))) / a
  } else if (box.kind === 'diamond') {
    const rx = b.width / 2
    const ry = b.height / 2
    let low = 0
    let high = 1
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2
      const inside = Math.abs(from.x + dx * mid - cx) / rx + Math.abs(from.y + dy * mid - cy) / ry <= 1
      if (inside) low = mid
      else high = mid
    }
    t = low
  } else {
    const tx = dx > 0 ? (b.x + b.width - from.x) / dx : dx < 0 ? (b.x - from.x) / dx : Infinity
    const ty = dy > 0 ? (b.y + b.height - from.y) / dy : dy < 0 ? (b.y - from.y) / dy : Infinity
    t = Math.min(tx, ty)
  }
  if (!Number.isFinite(t) || t >= 1 || t < 0) return from
  return { x: from.x + dx * t, y: from.y + dy * t }
}

function basis(points: Point[]): string {
  const p = points.map((pt) => ({ x: round(pt.x), y: round(pt.y) }))
  if (p.length < 3) return p.map((pt, i) => `${i ? 'L' : 'M'}${pt.x},${pt.y}`).join(' ')
  const parts = [`M${p[0].x},${p[0].y}`, `L${round((5 * p[0].x + p[1].x) / 6)},${round((5 * p[0].y + p[1].y) / 6)}`]
  for (let i = 2; i < p.length; i++) {
    const [a, b, c] = [p[i - 2], p[i - 1], p[i]]
    parts.push(
      `C${round((2 * a.x + b.x) / 3)},${round((2 * a.y + b.y) / 3)} ${round((a.x + 2 * b.x) / 3)},${round((a.y + 2 * b.y) / 3)} ${round((a.x + 4 * b.x + c.x) / 6)},${round((a.y + 4 * b.y + c.y) / 6)}`
    )
  }
  const [a, b] = [p[p.length - 2], p[p.length - 1]]
  parts.push(`C${round((2 * a.x + b.x) / 3)},${round((2 * a.y + b.y) / 3)} ${round((a.x + 2 * b.x) / 3)},${round((a.y + 2 * b.y) / 3)} ${b.x},${b.y}`)
  return parts.join(' ')
}

function midpoint(points: Point[]): Point {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y))
  let remaining = lengths.reduce((s, l) => s + l, 0) / 2
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i] > 0) {
      const t = remaining / lengths[i]
      return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t }
    }
    remaining -= lengths[i]
  }
  return points[0]
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  if (!rr) return `M${x},${y} H${x + w} V${y + h} H${x} Z`
  return `M${x + rr},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr} V${y + h - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} H${x + rr} A${rr},${rr} 0 0 1 ${x},${y + h - rr} V${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} Z`
}

function ellipse(x: number, y: number, w: number, h: number): string {
  const rx = w / 2
  const ry = h / 2
  return `M${x},${y + ry} A${rx},${ry} 0 1 0 ${x + w},${y + ry} A${rx},${ry} 0 1 0 ${x},${y + ry} Z`
}

export function outlinePath(kind: D2ShapeKind, x: number, y: number, w: number, h: number, radius?: number): string {
  const cx = x + w / 2
  const cy = y + h / 2
  const r = (v: number) => round(v)
  switch (kind) {
    case 'text':
    case 'image':
      return ''
    case 'circle':
    case 'oval':
      return ellipse(r(x), r(y), r(w), r(h))
    case 'diamond':
      return `M${r(cx)},${r(y)} L${r(x + w)},${r(cy)} L${r(cx)},${r(y + h)} L${r(x)},${r(cy)} Z`
    case 'hexagon': {
      const i = Math.min(w * 0.18, h / 2)
      return `M${r(x + i)},${r(y)} L${r(x + w - i)},${r(y)} L${r(x + w)},${r(cy)} L${r(x + w - i)},${r(y + h)} L${r(x + i)},${r(y + h)} L${r(x)},${r(cy)} Z`
    }
    case 'parallelogram': {
      const s = Math.min(20, w * 0.15)
      return `M${r(x + s)},${r(y)} L${r(x + w)},${r(y)} L${r(x + w - s)},${r(y + h)} L${r(x)},${r(y + h)} Z`
    }
    case 'step': {
      const t = Math.min(18, w * 0.2)
      return `M${r(x)},${r(y)} L${r(x + w - t)},${r(y)} L${r(x + w)},${r(cy)} L${r(x + w - t)},${r(y + h)} L${r(x)},${r(y + h)} L${r(x + t)},${r(cy)} Z`
    }
    case 'page': {
      const f = Math.min(14, w * 0.2, h * 0.3)
      return `M${r(x)},${r(y)} L${r(x + w - f)},${r(y)} L${r(x + w)},${r(y + f)} L${r(x + w)},${r(y + h)} L${r(x)},${r(y + h)} Z M${r(x + w - f)},${r(y)} L${r(x + w - f)},${r(y + f)} L${r(x + w)},${r(y + f)}`
    }
    case 'document': {
      const a = h * 0.1
      return `M${r(x)},${r(y)} L${r(x + w)},${r(y)} L${r(x + w)},${r(y + h - a)} C${r(x + w * 0.7)},${r(y + h - 3 * a)} ${r(x + w * 0.3)},${r(y + h + a)} ${r(x)},${r(y + h - a)} Z`
    }
    case 'cylinder': {
      const ry = Math.min(12, h * 0.15)
      const rx = w / 2
      return `M${r(x)},${r(y + ry)} A${r(rx)},${r(ry)} 0 0 1 ${r(x + w)},${r(y + ry)} L${r(x + w)},${r(y + h - ry)} A${r(rx)},${r(ry)} 0 0 1 ${r(x)},${r(y + h - ry)} Z M${r(x)},${r(y + ry)} A${r(rx)},${r(ry)} 0 0 0 ${r(x + w)},${r(y + ry)}`
    }
    case 'queue': {
      const rx = Math.min(12, w * 0.15)
      const ry = h / 2
      return `M${r(x + rx)},${r(y)} L${r(x + w - rx)},${r(y)} A${r(rx)},${r(ry)} 0 0 1 ${r(x + w - rx)},${r(y + h)} L${r(x + rx)},${r(y + h)} A${r(rx)},${r(ry)} 0 0 1 ${r(x + rx)},${r(y)} Z M${r(x + w - rx)},${r(y)} A${r(rx)},${r(ry)} 0 0 0 ${r(x + w - rx)},${r(y + h)}`
    }
    case 'package': {
      const tw = Math.min(w * 0.4, 64)
      const th = 14
      return `M${r(x)},${r(y)} L${r(x + tw)},${r(y)} L${r(x + tw)},${r(y + th)} L${r(x + w)},${r(y + th)} L${r(x + w)},${r(y + h)} L${r(x)},${r(y + h)} Z`
    }
    case 'stored_data': {
      const c = Math.min(14, w * 0.15)
      return `M${r(x + c)},${r(y)} L${r(x + w)},${r(y)} Q${r(x + w - c * 1.4)},${r(cy)} ${r(x + w)},${r(y + h)} L${r(x + c)},${r(y + h)} Q${r(x - c * 0.4)},${r(cy)} ${r(x + c)},${r(y)} Z`
    }
    case 'callout': {
      const bh = h - 14
      return `M${r(x)},${r(y)} L${r(x + w)},${r(y)} L${r(x + w)},${r(y + bh)} L${r(x + w * 0.45)},${r(y + bh)} L${r(x + w * 0.3)},${r(y + h)} L${r(x + w * 0.3)},${r(y + bh)} L${r(x)},${r(y + bh)} Z`
    }
    case 'cloud':
      return CLOUD.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, px: string, py: string) => `${r(x + Number(px) * w)},${r(y + Number(py) * h)}`)
    case 'person': {
      const sh = PERSON_HEIGHT
      const head = Math.min(w, sh) * 0.2
      const bw = Math.min(w, sh * 0.85)
      const left = cx - bw / 2
      const right = cx + bw / 2
      const top = y + head * 2 + 6
      const bottom = y + sh
      const bend = bw * 0.35
      return `${ellipse(r(cx - head), r(y), r(head * 2), r(head * 2))} M${r(left)},${r(bottom)} L${r(left)},${r(top + bend)} Q${r(left)},${r(top)} ${r(left + bend)},${r(top)} L${r(right - bend)},${r(top)} Q${r(right)},${r(top)} ${r(right)},${r(top + bend)} L${r(right)},${r(bottom)} Z`
    }
    default:
      return roundedRect(r(x), r(y), r(w), r(h), radius ?? (kind === 'square' || kind === 'rectangle' || kind === 'code' || tabular(kind) ? 6 : 0))
  }
}

function labelCenter(box: Box): Point {
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const lineHeight = box.fontSize * LINE
  const textH = box.label.length * lineHeight
  const icon = box.attrs.icon && box.kind !== 'image' ? (ICON_SIZE + 12) / 2 : 0
  if (box.children.length) return { x: cx, y: box.y + 10 + textH / 2 }
  switch (box.kind) {
    case 'person':
      return { x: cx, y: box.y + PERSON_HEIGHT + 8 + textH / 2 }
    case 'image':
      return { x: cx, y: box.y + IMAGE_SIZE + 8 + textH / 2 }
    case 'sql_table':
    case 'class':
      return { x: cx, y: box.y + HEADER_HEIGHT / 2 }
    case 'package':
      return { x: cx, y: cy + 7 }
    case 'callout':
      return { x: cx, y: cy - 7 }
    case 'cylinder':
      return { x: cx, y: cy + 6 }
    case 'document':
      return { x: cx, y: cy - box.height * 0.05 }
    case 'cloud':
      return { x: cx, y: cy + box.height * 0.05 }
    default:
      return { x: cx + icon, y: cy }
  }
}

function arrowhead(attrs: Record<string, string>, side: 'source' | 'target', directed: boolean): D2Arrowhead {
  const raw = attrs[`${side}-arrowhead.shape`]
  const kind = raw && ARROWHEADS.has(raw as D2ArrowheadKind) ? (raw as D2ArrowheadKind) : directed ? 'triangle' : 'none'
  const filledRaw = attrs[`${side}-arrowhead.style.filled`]
  return { kind, filled: filledRaw === undefined ? kind !== 'diamond' && kind !== 'circle' && kind !== 'box' : filledRaw === 'true', label: attrs[`${side}-arrowhead.label`] ?? '' }
}

function collect(box: Box, list: Box[]): void {
  if (box.level > 0) list.push(box)
  for (const child of box.children) collect(child, list)
}

function routeEdges(graph: D2Graph, owner: Map<string, Box>, holders: Map<number, Box>): Array<{ connection: D2Connection; points: Point[]; label: Point | null }> {
  const routed: Array<{ connection: D2Connection; points: Point[]; label: Point | null; pair: string }> = []
  graph.connections.forEach((connection, key) => {
    const source = owner.get(connection.source)
    const target = owner.get(connection.target)
    if (!source || !target) return
    if (source === target) {
      const b = shapeBounds(source)
      const right = b.x + b.width
      const cy = b.y + b.height / 2
      const reach = Math.max(28, b.height / 3)
      routed.push({
        connection,
        points: [
          { x: right, y: cy - b.height / 4 },
          { x: right + reach, y: cy - b.height / 3 },
          { x: right + reach, y: cy + b.height / 3 },
          { x: right, y: cy + b.height / 4 }
        ],
        label: { x: right + reach + 4, y: cy },
        pair: `${source.node.id}\u0000self`
      })
      return
    }
    const holder = holders.get(key)
    const route = holder?.routes.get(key)
    const offset = (p: Point): Point => ({ x: p.x + holder!.x + holder!.contentX, y: p.y + holder!.y + holder!.contentY })
    const points = route ? route.points.map(offset) : [anchor(source, connection.source), anchor(target, connection.target)]
    points[0] = anchor(source, connection.source)
    points[points.length - 1] = anchor(target, connection.target)
    const pair = [source.node.id, target.node.id].sort().join('\u0000')
    routed.push({ connection, points, label: route?.label ? offset(route.label) : null, pair })
  })
  const groups = new Map<string, typeof routed>()
  for (const entry of routed) groups.set(entry.pair, [...(groups.get(entry.pair) ?? []), entry])
  for (const group of groups.values()) {
    if (group.length < 2 || group[0].pair.endsWith('\u0000self')) continue
    group.forEach((entry, k) => {
      const shift = (k - (group.length - 1) / 2) * PARALLEL_GAP
      const first = entry.points[0]
      const last = entry.points[entry.points.length - 1]
      const sign = entry.connection.source <= entry.connection.target ? 1 : -1
      const length = Math.hypot(last.x - first.x, last.y - first.y) || 1
      const nx = (-(last.y - first.y) / length) * sign
      const ny = ((last.x - first.x) / length) * sign
      if (entry.points.length === 2) entry.points.splice(1, 0, { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 })
      for (let i = 1; i < entry.points.length - 1; i++) entry.points[i] = { x: entry.points[i].x + nx * shift, y: entry.points[i].y + ny * shift }
      if (entry.label) entry.label = { x: entry.label.x + nx * shift, y: entry.label.y + ny * shift }
    })
  }
  for (const entry of routed) {
    if (entry.pair.endsWith('\u0000self')) continue
    const source = owner.get(entry.connection.source)!
    const target = owner.get(entry.connection.target)!
    const p = entry.points
    p[0] = clip(source, p[0], p[1])
    p[p.length - 1] = clip(target, p[p.length - 1], p[p.length - 2])
  }
  return routed
}

export function d2ToDiagram(source: string, file: string): D2Diagram {
  const graph = parseD2(source, file)
  const { root, owner } = buildBoxes(graph)
  const edges = assignEdges(graph, owner)
  const holders = new Map<number, Box>()
  for (const [box, list] of edges) for (const edge of list) holders.set(edge.key, box)
  sizeBox(root, edges)
  placeBox(root, 0, 0)
  placeNear(root)
  const routed = routeEdges(graph, owner, holders)

  const boxes: Box[] = []
  collect(root, boxes)
  const labels = routed.map((entry) => {
    const size = edgeLabelSize(entry.connection)
    const at = entry.label ?? midpoint(entry.points)
    return { ...size, at }
  })
  let minX = 0
  let minY = 0
  let maxX = root.width
  let maxY = root.height
  for (const box of boxes) {
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }
  routed.forEach((entry, i) => {
    for (const p of entry.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    const label = labels[i]
    if (label.width) {
      minX = Math.min(minX, label.at.x - label.width / 2)
      maxX = Math.max(maxX, label.at.x + label.width / 2)
      minY = Math.min(minY, label.at.y - label.height / 2)
      maxY = Math.max(maxY, label.at.y + label.height / 2)
    }
  })
  const dx = DIAGRAM_PAD - minX
  const dy = DIAGRAM_PAD - minY
  for (const box of boxes) {
    box.x += dx
    box.y += dy
  }

  const shapes: D2Shape[] = boxes.map((box) => {
    const at = labelCenter(box)
    const rows = box.rows.map((row, i) => ({ name: row.name, type: row.type, constraint: row.constraint, y: round(box.y + HEADER_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT / 2) }))
    const doubled = box.style.doubleBorder && !box.children.length
    return {
      id: box.node.id,
      kind: box.kind,
      label: box.label,
      x: round(box.x),
      y: round(box.y),
      width: round(box.width),
      height: round(box.height),
      container: box.children.length > 0,
      level: box.level,
      outline: outlinePath(box.kind, box.x, box.y, box.width, box.height, box.style.radius),
      inner: doubled ? outlinePath(box.kind, box.x + 5, box.y + 5, box.width - 10, box.height - 10, box.style.radius) : '',
      labelX: round(at.x),
      labelY: round(at.y),
      fontSize: box.fontSize,
      headerHeight: tabular(box.kind) ? HEADER_HEIGHT : 0,
      rows,
      rowInset: box.rowInset,
      icon: box.attrs.icon ?? '',
      iconX: round(box.kind === 'image' ? box.x + (box.width - IMAGE_SIZE) / 2 : box.children.length ? box.x + 10 : box.x + PAD_X - 8),
      iconY: round(box.kind === 'image' ? box.y : box.children.length ? box.y + 10 : box.y + box.height / 2 - ICON_SIZE / 2),
      iconSize: box.kind === 'image' ? IMAGE_SIZE : box.attrs.icon ? ICON_SIZE : 0,
      link: box.attrs.link ?? '',
      tooltip: box.attrs.tooltip ?? '',
      style: box.style
    }
  })

  const diagramEdges: D2Edge[] = routed.map((entry, i) => {
    const attrs = mergedAttrs(graph, entry.connection)
    const label = labels[i]
    const points = entry.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
    return {
      id: `${entry.connection.source}->${entry.connection.target}#${i}`,
      path: basis(points),
      label: label.lines,
      labelX: round(label.at.x + dx),
      labelY: round(label.at.y + dy),
      labelWidth: round(label.width),
      labelHeight: round(label.height),
      fontSize: label.fontSize,
      source: arrowhead(attrs, 'source', entry.connection.sourceArrow),
      target: arrowhead(attrs, 'target', entry.connection.targetArrow),
      style: styleOf(attrs)
    }
  })

  return {
    width: Math.ceil(maxX - minX + 2 * DIAGRAM_PAD),
    height: Math.ceil(maxY - minY + 2 * DIAGRAM_PAD),
    shapes,
    edges: diagramEdges,
    files: graph.files
  }
}
