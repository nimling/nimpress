<script lang="ts">
  import { onMount, tick, mount, unmount } from 'svelte'
  import type { PageModule, RoadmapEntry, RoadmapKind } from '../types'
  import { configStore } from '../framework/configStore'
  import { setupHashSpy } from '../framework/hashSpy'
  import { navigate } from 'sly-svelte-location-router'
  import BackToTop from '../layout/BackToTop.svelte'
  import RoadmapNode from './RoadmapNode.svelte'
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
  let spinePathEl: SVGPathElement | null = $state(null)
  let hoverHref = $state<string | null>(null)
  let mounts: Array<{ destroy: () => void }> = []
  let trackHeight = $state(0)
  let trackWidth = $state(1100)
  let totalLength = $state(0)
  let rocketProgress = $state(0)
  let flying = $state(false)
  let now = $state(new Date().toISOString())
  let asideTop = $state(0)
  let asideLeft = $state(0)
  let measuredSizes = $state<Record<string, [number, number]>>({})

  function recordMeasure(href: string, visW: number, visH: number) {
    const cur = measuredSizes[href]
    if (cur && Math.abs(cur[0] - visW) < 1 && Math.abs(cur[1] - visH) < 1) return
    measuredSizes = { ...measuredSizes, [href]: [visW, visH] }
  }

  const TRACK_PAD_TOP = 32
  const NODE_W_BASE = 320
  const NODE_H_BASE = 200
  const DEPTH_SCALE = 0.55
  const SUBTREE_GAP = 32
  const SIBLING_GAP = 26
  const CELL_PAD = 18
  const CELL_MAX = 520
  const SPINE_BOTTOM_BUFFER = 40

  interface TreeNode {
    entry: RoadmapEntry
    depth: number
    children: TreeNode[]
  }

  interface NodeBox {
    entry: RoadmapEntry
    depth: number
    x: number
    y: number
    w: number
    h: number
    anchorX?: number
    anchorY?: number
    anchorSide?: 'left' | 'right'
    date?: number
  }

  interface CellLayout {
    boxes: NodeBox[]
    w: number
    h: number
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

  const TRACK_PAD_X = 24

  interface ClusterEdge {
    d: string
    kind: 'parent-child' | 'branch' | 'child-branch'
  }

  function nodeScaleAt(depth: number): number {
    return Math.pow(DEPTH_SCALE, depth)
  }

  function nodeWAt(depth: number): number {
    return Math.round(NODE_W_BASE * nodeScaleAt(depth))
  }

  function nodeHAt(depth: number): number {
    return Math.round(NODE_H_BASE * nodeScaleAt(depth))
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

  function scaleBoxes(boxes: NodeBox[], s: number): NodeBox[] {
    return boxes.map((b) => ({
      entry: b.entry,
      depth: b.depth,
      x: b.x * s,
      y: b.y * s,
      w: b.w * s,
      h: b.h * s
    }))
  }

  function layoutSubtree(node: TreeNode): CellLayout {
    const w = nodeWAt(node.depth)
    const h = nodeHAt(node.depth)

    if (node.children.length === 0) {
      return { boxes: [{ entry: node.entry, depth: node.depth, x: 0, y: 0, w, h }], w, h }
    }

    const childLayouts = node.children.map((c) => layoutSubtree(c))
    const childrenW = childLayouts.reduce((s, c) => s + c.w, 0) + SIBLING_GAP * (childLayouts.length - 1)
    const childrenH = Math.max(...childLayouts.map((c) => c.h))

    const naturalW = Math.max(w, childrenW)
    const parentOffsetX = (naturalW - w) / 2
    const childrenStartX = (naturalW - childrenW) / 2

    const boxes: NodeBox[] = []
    boxes.push({ entry: node.entry, depth: node.depth, x: parentOffsetX, y: 0, w, h })

    let curX = childrenStartX
    for (const cl of childLayouts) {
      for (const b of cl.boxes) {
        boxes.push({
          entry: b.entry,
          depth: b.depth,
          x: b.x + curX,
          y: b.y + h + SUBTREE_GAP,
          w: b.w,
          h: b.h
        })
      }
      curX += cl.w + SIBLING_GAP
    }

    return { boxes, w: naturalW, h: h + SUBTREE_GAP + childrenH }
  }

  function fitChildrenToBudget(layout: CellLayout, availW: number, availH: number): CellLayout {
    if (layout.boxes.length < 2) return layout
    const root = layout.boxes[0]
    const descendants = layout.boxes.slice(1)
    const minX = Math.min(...descendants.map((b) => b.x))
    const maxX = Math.max(...descendants.map((b) => b.x + b.w))
    const minY = Math.min(...descendants.map((b) => b.y))
    const maxY = Math.max(...descendants.map((b) => b.y + b.h))
    const descW = maxX - minX
    const descH = maxY - minY
    const descAvailH = Math.max(0, availH - root.h - SUBTREE_GAP)
    const sW = descW > availW ? availW / descW : 1
    const sH = descH > descAvailH ? descAvailH / descH : 1
    const s = Math.min(sW, sH)

    const newDescW = descW * s
    const newDescH = descH * s
    const newTotalW = Math.max(root.w, newDescW)
    const newRootX = (newTotalW - root.w) / 2
    const newDescStartX = (newTotalW - newDescW) / 2
    const newDescStartY = root.h + SUBTREE_GAP

    const newRoot: NodeBox = { ...root, x: newRootX, y: 0 }
    const scaledDescendants = descendants.map((b) => ({
      entry: b.entry,
      depth: b.depth,
      x: newDescStartX + (b.x - minX) * s,
      y: newDescStartY + (b.y - minY) * s,
      w: b.w * s,
      h: b.h * s
    }))

    return {
      boxes: [newRoot, ...scaledDescendants],
      w: newTotalW,
      h: root.h + SUBTREE_GAP + newDescH
    }
  }

  function cellSideFor(roots: TreeNode[], availW: number): number {
    let maxSide = NODE_W_BASE
    for (const r of roots) {
      const f = layoutSubtree(r)
      const target = Math.min(availW, Math.max(f.w, f.h))
      maxSide = Math.max(maxSide, target)
    }
    return Math.ceil(maxSide + CELL_PAD * 2)
  }

  const tree = $derived(buildTree(entries))
  const effectiveTrackW = $derived(trackWidth || 1100)
  const availSubtreeW = $derived(Math.max(360, effectiveTrackW * 0.62))
  const cellSide = $derived(Math.min(effectiveTrackW * 0.66, cellSideFor(tree, availSubtreeW)))
  const layout = $derived(layoutTrack(tree, effectiveTrackW, cellSide, availSubtreeW))
  const edgeList = $derived(buildParentEdges(layout.rows, entries))
  const spinePath = $derived(buildSpinePath(layout.rows, effectiveTrackW, Math.max(trackHeight, layout.totalH + 64), cellSide))
  const spineConnectors = $derived(buildSpineConnectors(layout.rows, effectiveTrackW))
  const clusterEdges = $derived(
    buildClusterEdges(layout.rows, effectiveTrackW, (date) => {
      if (!date || totalLength === 0 || !spinePathEl) return null
      const pt = pointAt(progressForDate(date))
      return { x: pt.x, y: pt.y }
    })
  )
  const dateBounds = $derived(computeBounds(entries))
  const changelogMarkers = $derived(collectChangelogMarkers(tree))
  const activeHover = $derived(findActiveHover(tree, hoverHref))
  const rocketPoint = $derived(pointAt(rocketProgress))
  const todayPoint = $derived(pointAt(progressForDate(now)))

  const MIN_GAP = 20
  const AVG_GAP = 56

  interface ParentEdge {
    id: string
    d: string
  }

  function buildParentEdges(rows: RowLayout[], allEntries: RoadmapEntry[]): ParentEdge[] {
    const byHref = new Map<string, NodeBox>()
    for (const r of rows) for (const b of r.boxes) byHref.set(b.entry.href, b)
    const result: ParentEdge[] = []
    for (const e of allEntries) {
      if (!e.parent) continue
      const child = byHref.get(e.href)
      const parent = byHref.get(e.parent)
      if (!child || !parent) continue
      const cx = child.x + child.w / 2
      const cy = child.y + child.h / 2
      const px = parent.x + parent.w / 2
      const py = parent.y + parent.h / 2
      const dx = cx - px
      const dy = cy - py
      const dist = Math.hypot(dx, dy) || 1
      const nx = dx / dist
      const ny = dy / dist
      const ringP = Math.min(
        Math.abs(nx) > 0.001 ? parent.w / 2 / Math.abs(nx) : Infinity,
        Math.abs(ny) > 0.001 ? parent.h / 2 / Math.abs(ny) : Infinity
      )
      const ringC = Math.min(
        Math.abs(nx) > 0.001 ? child.w / 2 / Math.abs(nx) : Infinity,
        Math.abs(ny) > 0.001 ? child.h / 2 / Math.abs(ny) : Infinity
      )
      const sx = px + nx * ringP
      const sy = py + ny * ringP
      const ex = cx - nx * ringC
      const ey = cy - ny * ringC
      const mx = (sx + ex) / 2
      const my = (sy + ey) / 2
      const curve = dist * 0.18
      const cpx = mx - ny * curve
      const cpy = my + nx * curve
      const d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`
      result.push({ id: `${e.parent}->${e.href}`, d })
    }
    return result
  }

  function layoutTrack(roots: TreeNode[], w: number, _side: number, _availW: number): { rows: RowLayout[]; totalH: number } {
    const cx = w / 2
    if (roots.length === 0) return { rows: [], totalH: 0 }

    const sortedRoots = [...roots].sort((a, b) =>
      (a.entry.targetDate ?? '').localeCompare(b.entry.targetDate ?? '')
    )
    const N = sortedRoots.length
    const rootTimes = sortedRoots.map((r) =>
      r.entry.targetDate ? new Date(r.entry.targetDate).getTime() : 0
    )

    const FIRST_X = 100
    const MIN_VERT_GAP = 200
    const TIME_PX_PER_DAY = 0.5
    const TOP_PAD = 80
    const BOTTOM_PAD = 80
    const PATH_CLEARANCE = 20
    const COLUMN_GAP = 16
    const PARENT_TO_CHILD_GAP = 18
    const MIN_SIB_GAP = 16
    const Y_PER_DAY_CHILD = 0.35
    const CLUSTER_EDGE_GAP = 40

    interface RelBox {
      entry: RoadmapEntry
      depth: number
      x: number
      y: number
      w: number
      h: number
      date: number
    }

    function preplaceSubtree(root: TreeNode, rootDate: number, sideDir: 1 | -1): {
      boxes: RelBox[]
      aboveExtent: number
      belowExtent: number
    } {
      const FAN_ARC = Math.PI / 2
      const SUB_FAN_ARC = Math.PI / 3

      interface Node {
        entry: RoadmapEntry
        depth: number
        parent: Node | null
        date: number
        w: number
        h: number
        baseW: number
        baseH: number
        cx: number
        cy: number
        vx: number
        vy: number
        fixed: boolean
      }

      const nodes: Node[] = []
      const byDepth = new Map<number, Node[]>()

      function build(treeNode: TreeNode, parent: Node | null, depth: number) {
        const scale = Math.pow(DEPTH_SCALE, depth)
        const baseW = depth === 0 ? NODE_W_BASE : Math.round(NODE_W_BASE * scale)
        const baseH = depth === 0 ? NODE_H_BASE : Math.round(NODE_H_BASE * scale)
        const measured = measuredSizes[treeNode.entry.href]
        const w = measured ? measured[0] : baseW
        const h = measured ? measured[1] : baseH
        const date = depth === 0
          ? rootDate
          : (treeNode.entry.targetDate ? new Date(treeNode.entry.targetDate).getTime() : 0)
        const node: Node = {
          entry: treeNode.entry,
          depth,
          parent,
          date,
          w,
          h,
          baseW,
          baseH,
          cx: 0,
          cy: 0,
          vx: 0,
          vy: 0,
          fixed: depth === 0
        }
        nodes.push(node)
        if (!byDepth.has(depth)) byDepth.set(depth, [])
        byDepth.get(depth)!.push(node)

        const kids = treeNode.children.map((c) => ({
          node: c,
          date: c.entry.targetDate ? new Date(c.entry.targetDate).getTime() : 0
        }))
        const later = kids.filter((k) => k.date > date).sort((a, b) => a.date - b.date)
        const earlier = kids.filter((k) => k.date <= date).sort((a, b) => b.date - a.date)

        for (const k of earlier) build(k.node, node, depth + 1)
        for (const k of later) build(k.node, node, depth + 1)
      }
      build(root, null, 0)

      const rootNode = nodes[0]
      rootNode.cx = 0
      rootNode.cy = 0
      rootNode.fixed = true

      if (nodes.length === 1) {
        return {
          boxes: [{
            entry: root.entry, depth: 0,
            x: -NODE_W_BASE / 2, y: -NODE_H_BASE / 2,
            w: NODE_W_BASE, h: NODE_H_BASE,
            date: rootDate
          }],
          aboveExtent: NODE_H_BASE / 2,
          belowExtent: NODE_H_BASE / 2
        }
      }

      function ringRadius(pw: number, ph: number, angle: number): number {
        const ca = Math.abs(Math.cos(angle))
        const sa = Math.abs(Math.sin(angle))
        if (sa < 0.001) return pw / 2
        if (ca < 0.001) return ph / 2
        return Math.min(pw / 2 / ca, ph / 2 / sa)
      }

      function idealRadiusAt(p: Node, c: Node, angle: number): number {
        const ca = Math.abs(Math.cos(angle))
        const sa = Math.abs(Math.sin(angle))
        const parentReach = ringRadius(p.w * HALO_INFLATE, p.h * HALO_INFLATE, angle)
        const childSupport = ca * c.w * HALO_INFLATE / 2 + sa * c.h * HALO_INFLATE / 2
        return parentReach + childSupport + 14
      }

      function idealRadius(p: Node, c: Node): number {
        return Math.hypot(p.w / 2 + c.w / 2 + 8, p.h / 2 + c.h / 2 + 8) * 0.85
      }

      function seedChildren(parent: Node, kids: Node[]) {
        const earlier = kids.filter((k) => k.date <= parent.date).sort((a, b) => b.date - a.date)
        const later = kids.filter((k) => k.date > parent.date).sort((a, b) => a.date - b.date)

        let outX = 0
        let outY = 1
        if (parent.parent) {
          const dx = parent.cx - parent.parent.cx
          const dy = parent.cy - parent.parent.cy
          const d = Math.hypot(dx, dy) || 1
          outX = dx / d
          outY = dy / d
        } else {
          outY = 1
          outX = -sideDir * 0.5
          const m = Math.hypot(outX, outY)
          outX /= m
          outY /= m
        }
        const outAngle = Math.atan2(outY, outX)

        function placeFan(list: Node[], sign: 1 | -1, span: number, isRoot: boolean) {
          let center: number
          if (isRoot) {
            center = sign === 1 ? Math.PI / 2 - sideDir * (Math.PI / 8) : -Math.PI / 2 - sideDir * (Math.PI / 8)
          } else {
            const perpA = outAngle + Math.PI / 2
            const perpB = outAngle - Math.PI / 2
            if (sign === 1) {
              center = Math.sin(perpA) > Math.sin(perpB) ? perpA : perpB
            } else {
              center = Math.sin(perpA) < Math.sin(perpB) ? perpA : perpB
            }
          }
          for (let i = 0; i < list.length; i++) {
            const t = list.length === 1 ? 0 : i / (list.length - 1) - 0.5
            const angle = center + t * span
            const r = idealRadiusAt(parent, list[i], angle)
            list[i].cx = parent.cx + r * Math.cos(angle)
            list[i].cy = parent.cy + r * Math.sin(angle)
          }
        }

        const isRoot = parent.depth === 0
        const span = isRoot ? FAN_ARC : SUB_FAN_ARC
        placeFan(earlier, 1, span, isRoot)
        placeFan(later, -1, span, isRoot)
      }

      const PARENT_SPRING_K = 0.28
      const REPULSE_PAD = 4
      const REPULSE_K = 0.95
      const DAMPING = 0.78
      const ITER_PER_LAYER = 200
      const HALO_INFLATE = 1.18

      const maxDepth = Math.max(...nodes.map((n) => n.depth))

      function settleLayer(layer: Node[], placedSoFar: Node[]) {
        for (const n of layer) { n.vx = 0; n.vy = 0 }

        for (let iter = 0; iter < ITER_PER_LAYER; iter++) {
          const fx = new Map<Node, number>()
          const fy = new Map<Node, number>()
          for (const n of layer) { fx.set(n, 0); fy.set(n, 0) }

          for (const n of layer) {
            const p = n.parent!
            const dx = n.cx - p.cx
            const dy = n.cy - p.cy
            const dist = Math.hypot(dx, dy) || 0.001
            const angle = Math.atan2(dy, dx)
            const ideal = idealRadiusAt(p, n, angle)
            const delta = dist - ideal
            fx.set(n, fx.get(n)! - (dx / dist) * delta * PARENT_SPRING_K)
            fy.set(n, fy.get(n)! - (dy / dist) * delta * PARENT_SPRING_K)
          }

          for (const n of layer) {
            for (const other of placedSoFar) {
              if (other === n) continue
              const dx = n.cx - other.cx
              const dy = n.cy - other.cy
              const ax = n.w * HALO_INFLATE / 2 + other.w * HALO_INFLATE / 2 + REPULSE_PAD
              const ay = n.h * HALO_INFLATE / 2 + other.h * HALO_INFLATE / 2 + REPULSE_PAD
              const ox = ax - Math.abs(dx)
              const oy = ay - Math.abs(dy)
              if (ox > 0 && oy > 0) {
                if (ox < oy) {
                  const push = ox * REPULSE_K
                  const sgn = Math.abs(dx) < 0.5 ? (Math.random() > 0.5 ? -1 : 1) : (dx >= 0 ? 1 : -1)
                  fx.set(n, fx.get(n)! + sgn * push)
                } else {
                  const push = oy * REPULSE_K
                  const sgn = Math.abs(dy) < 0.5 ? (Math.random() > 0.5 ? -1 : 1) : (dy >= 0 ? 1 : -1)
                  fy.set(n, fy.get(n)! + sgn * push)
                }
              }
            }
            for (const m of layer) {
              if (m === n) continue
              const dx = n.cx - m.cx
              const dy = n.cy - m.cy
              const ax = n.w * HALO_INFLATE / 2 + m.w * HALO_INFLATE / 2 + REPULSE_PAD
              const ay = n.h * HALO_INFLATE / 2 + m.h * HALO_INFLATE / 2 + REPULSE_PAD
              const ox = ax - Math.abs(dx)
              const oy = ay - Math.abs(dy)
              if (ox > 0 && oy > 0) {
                if (ox < oy) {
                  const push = ox * REPULSE_K * 0.5
                  const sgn = dx >= 0 ? 1 : -1
                  fx.set(n, fx.get(n)! + sgn * push)
                } else {
                  const push = oy * REPULSE_K * 0.5
                  const sgn = dy >= 0 ? 1 : -1
                  fy.set(n, fy.get(n)! + sgn * push)
                }
              }
            }
          }

          for (const n of layer) {
            n.vx = (n.vx + (fx.get(n) ?? 0)) * DAMPING
            n.vy = (n.vy + (fy.get(n) ?? 0)) * DAMPING
            const maxStep = 12
            if (n.vx > maxStep) n.vx = maxStep
            if (n.vx < -maxStep) n.vx = -maxStep
            if (n.vy > maxStep) n.vy = maxStep
            if (n.vy < -maxStep) n.vy = -maxStep
            n.cx += n.vx
            n.cy += n.vy
          }
        }
      }

      const placed: Node[] = [rootNode]
      for (let d = 1; d <= maxDepth; d++) {
        const layer = byDepth.get(d) ?? []
        const byParent = new Map<Node, Node[]>()
        for (const n of layer) {
          const p = n.parent!
          if (!byParent.has(p)) byParent.set(p, [])
          byParent.get(p)!.push(n)
        }
        for (const [p, kids] of byParent) {
          seedChildren(p, kids)
        }
        settleLayer(layer, placed)
        for (const n of layer) {
          n.fixed = true
          placed.push(n)
        }
      }

      for (let pass = 0; pass < 80; pass++) {
        let moved = false
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i]
            const b = nodes[j]
            const dx = a.cx - b.cx
            const dy = a.cy - b.cy
            const ax = a.w * HALO_INFLATE / 2 + b.w * HALO_INFLATE / 2 + REPULSE_PAD
            const ay = a.h * HALO_INFLATE / 2 + b.h * HALO_INFLATE / 2 + REPULSE_PAD
            const ox = ax - Math.abs(dx)
            const oy = ay - Math.abs(dy)
            if (ox > 0.5 && oy > 0.5) {
              moved = true
              const aRoot = a === rootNode
              const bRoot = b === rootNode
              const factor = aRoot || bRoot ? 1.0 : 0.5
              if (ox < oy) {
                const sgn = Math.abs(dx) < 0.5 ? (i < j ? -1 : 1) : (dx >= 0 ? 1 : -1)
                if (!aRoot) a.cx += sgn * ox * factor
                if (!bRoot) b.cx -= sgn * ox * factor
              } else {
                const sgn = Math.abs(dy) < 0.5 ? (i < j ? -1 : 1) : (dy >= 0 ? 1 : -1)
                if (!aRoot) a.cy += sgn * oy * factor
                if (!bRoot) b.cy -= sgn * oy * factor
              }
            }
          }
        }
        if (!moved) break
      }

      const boxes: RelBox[] = nodes.map((n) => ({
        entry: n.entry,
        depth: n.depth,
        x: n.cx - n.baseW / 2,
        y: n.cy - n.baseH / 2,
        w: n.baseW,
        h: n.baseH,
        date: n.date
      }))

      let aboveExtent = NODE_H_BASE / 2
      let belowExtent = NODE_H_BASE / 2
      for (const b of boxes) {
        if (-b.y > aboveExtent) aboveExtent = -b.y
        if (b.y + b.h > belowExtent) belowExtent = b.y + b.h
      }
      return { boxes, aboveExtent, belowExtent }
    }

    const sides: ('left' | 'right')[] = sortedRoots.map((_, i) => (i % 2 === 0 ? 'left' : 'right'))
    const xs = sides.map((s) => (s === 'left' ? FIRST_X : w - FIRST_X - NODE_W_BASE))

    const preplaced = sortedRoots.map((root, i) =>
      preplaceSubtree(root, rootTimes[i], sides[i] === 'left' ? 1 : -1)
    )

    const gaps: number[] = []
    for (let i = 1; i < N; i++) {
      const dt = Math.abs(rootTimes[i] - rootTimes[i - 1])
      const days = dt / 86400000
      const timeGap = days * TIME_PX_PER_DAY
      const aboveOfPrev = preplaced[i - 1].aboveExtent - NODE_H_BASE / 2
      const belowOfThis = preplaced[i].belowExtent - NODE_H_BASE / 2
      const clusterGap = aboveOfPrev + belowOfThis + CLUSTER_EDGE_GAP
      gaps.push(Math.max(MIN_VERT_GAP, timeGap, clusterGap))
    }

    const totalIssueHeight = N * NODE_H_BASE
    const totalGapHeight = gaps.reduce((s, g) => s + g, 0)
    const topAboveExtra = preplaced[N - 1].aboveExtent - NODE_H_BASE / 2
    const bottomBelowExtra = preplaced[0].belowExtent - NODE_H_BASE / 2
    const totalH = TOP_PAD + topAboveExtra + totalIssueHeight + totalGapHeight + bottomBelowExtra + BOTTOM_PAD

    const rootMidY: number[] = []
    rootMidY[0] = totalH - BOTTOM_PAD - bottomBelowExtra - NODE_H_BASE / 2
    for (let i = 1; i < N; i++) {
      rootMidY[i] = rootMidY[i - 1] - gaps[i - 1] - NODE_H_BASE
    }

    const rows: RowLayout[] = []
    for (let i = 0; i < N; i++) {
      const side = sides[i]
      const x = xs[i]
      const rootCenterX = x + NODE_W_BASE / 2
      const cy = rootMidY[i]
      const rootAnchorX = side === 'left' ? x + NODE_W_BASE + PATH_CLEARANCE : x - PATH_CLEARANCE

      const boxes: NodeBox[] = []
      for (const rb of preplaced[i].boxes) {
        const absCenterX = rb.x + rb.w / 2 + rootCenterX
        let absX = absCenterX - rb.w / 2
        absX = Math.max(TRACK_PAD_X, Math.min(w - TRACK_PAD_X - rb.w, absX))
        const absY = rb.y + cy
        boxes.push({
          entry: rb.entry,
          depth: rb.depth,
          x: absX,
          y: absY,
          w: rb.w,
          h: rb.h,
          anchorSide: side,
          anchorX: side === 'left' ? absX + rb.w + PATH_CLEARANCE : absX - PATH_CLEARANCE,
          anchorY: absY + rb.h / 2,
          date: rb.date
        })
      }

      rows.push({
        rootEntry: sortedRoots[i].entry,
        side,
        boxes,
        top: cy - NODE_H_BASE / 2,
        cellSide: NODE_H_BASE,
        issueCellX: x,
        pathCellX: 0,
        pathCenterX: cx,
        rowMid: cy,
        gapAfter: 0,
        spineAnchorX: rootAnchorX,
        spineAnchorY: cy
      })
    }

    return { rows, totalH }
  }

  function generateSwirlsBetween(
    start: { x: number; y: number },
    end: { x: number; y: number },
    targetLength: number,
    xMin: number,
    xMax: number
  ): { x: number; y: number }[] {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const straightLen = Math.hypot(dx, dy)
    const extra = targetLength - straightLen
    if (extra <= 40 || straightLen < 1) return []

    const clampX = (x: number) => Math.max(xMin, Math.min(xMax, x))

    const swirlCount = Math.max(1, Math.min(10, Math.floor(extra / 90)))

    const perpX = -dy / straightLen
    const perpY = dx / straightLen
    const alleyHalf = (xMax - xMin) / 2
    const reach = Math.min(alleyHalf * 0.9, Math.max(80, extra * 0.16))

    const waypoints: { x: number; y: number }[] = []
    for (let i = 1; i <= swirlCount; i++) {
      const t = i / (swirlCount + 1)
      const baseX = start.x + dx * t
      const baseY = start.y + dy * t
      const sign = i % 2 === 1 ? 1 : -1
      const wx = clampX(baseX + sign * reach * perpX)
      const wy = baseY + sign * reach * perpY
      waypoints.push({ x: wx, y: wy })
    }
    return waypoints
  }

  interface SpineAnchor {
    box: NodeBox
    x: number
    y: number
    side: 1 | -1
    date: number
  }

  function computeSpineAnchors(rows: RowLayout[], w: number): SpineAnchor[] {
    const boxes: NodeBox[] = []
    for (const r of rows) for (const b of r.boxes) {
      if (b.depth === 0) boxes.push(b)
    }
    boxes.sort((a, b) => (a.date ?? 0) - (b.date ?? 0))
    const cx = w / 2
    const BLOB_VISIBLE_FACTOR = 1.5
    return boxes.map((b) => {
      const center = b.x + b.w / 2
      const side: 1 | -1 = center <= cx ? 1 : -1
      const haloHalfW = b.w * (BLOB_VISIBLE_FACTOR - 1) / 2
      const ax = side === 1 ? b.x + b.w + haloHalfW + 12 : b.x - haloHalfW - 12
      const ay = b.y + b.h / 2
      return { box: b, x: ax, y: ay, side, date: b.date ?? 0 }
    })
  }

  function generateSwirlBetween(
    start: { x: number; y: number },
    end: { x: number; y: number },
    targetLen: number,
    clusterCx: number,
    clusterCy: number
  ): { x: number; y: number }[] {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const straight = Math.hypot(dx, dy) || 1
    const extra = targetLen - straight
    if (extra <= 50) return []
    const count = Math.max(1, Math.min(8, Math.floor(extra / 100)))
    const reach = Math.min(140, Math.max(40, extra * 0.18))
    const perpX = -dy / straight
    const perpY = dx / straight
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2
    const toClusterX = clusterCx - midX
    const toClusterY = clusterCy - midY
    const dot = toClusterX * perpX + toClusterY * perpY
    const clearSign = dot > 0 ? -1 : 1
    const pts: { x: number; y: number }[] = []
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1)
      const bx = start.x + dx * t
      const by = start.y + dy * t
      const lobe = Math.sin(Math.PI * t)
      const r = reach * (0.5 + 0.5 * lobe)
      pts.push({ x: bx + clearSign * r * perpX, y: by + clearSign * r * perpY })
    }
    return pts
  }

  function computeSpineX(boxes: NodeBox[]): number {
    const BLOB_VISIBLE_FACTOR = 1.5
    let maxRight = 0
    for (const b of boxes) {
      const haloRight = b.w * (BLOB_VISIBLE_FACTOR - 1) / 2
      const right = b.x + b.w + haloRight
      if (right > maxRight) maxRight = right
    }
    return maxRight + 30
  }

  function buildSpinePath(rows: RowLayout[], w: number, trackH: number, _side: number): string {
    if (!rows.length || w <= 0 || trackH <= 0) return ''
    const anchors = computeSpineAnchors(rows, w)
    if (anchors.length === 0) return ''

    const allBoxes: NodeBox[] = []
    for (const r of rows) for (const b of r.boxes) allBoxes.push(b)
    let cxSum = 0
    let cySum = 0
    for (const b of allBoxes) {
      cxSum += b.x + b.w / 2
      cySum += b.y + b.h / 2
    }
    const clusterCx = allBoxes.length > 0 ? cxSum / allBoxes.length : w / 2
    const clusterCy = allBoxes.length > 0 ? cySum / allBoxes.length : 0

    const oldest = anchors[0]
    const newest = anchors[anchors.length - 1]

    const planetX = w / 2
    const planetY = trackH

    const pts: { x: number; y: number }[] = []
    pts.push({ x: planetX, y: planetY })

    const span = planetY - oldest.y
    const approachY = oldest.y + Math.min(span * 0.45, Math.max(80, span * 0.3))
    pts.push({ x: oldest.x, y: approachY })
    pts.push({ x: oldest.x, y: oldest.y })

    const TIME_PX_PER_DAY = 5
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i]
      const b = anchors[i + 1]
      const days = Math.abs(b.date - a.date) / 86400000
      const straight = Math.hypot(b.x - a.x, b.y - a.y)
      const target = Math.max(straight + 40, days * TIME_PX_PER_DAY)
      const swirls = generateSwirlBetween({ x: a.x, y: a.y }, { x: b.x, y: b.y }, target, clusterCx, clusterCy)
      for (const s of swirls) pts.push(s)
      pts.push({ x: b.x, y: b.y })
    }

    pts.push({ x: newest.x, y: newest.y - 80 })

    return pointsToCentripetalCatmullRomPath(pts)
  }

  function buildSpineConnectors(rows: RowLayout[], w: number): { id: string; d: string }[] {
    const anchors = computeSpineAnchors(rows, w)
    if (anchors.length === 0) return []
    const BLOB_VISIBLE_FACTOR = 1.5

    return anchors.map((a) => {
      const box = a.box
      const haloHalfW = box.w * (BLOB_VISIBLE_FACTOR - 1) / 2
      const startX = a.side === 1 ? box.x + box.w + haloHalfW : box.x - haloHalfW
      const startY = box.y + box.h / 2
      const d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${a.x.toFixed(1)} ${a.y.toFixed(1)}`
      return { id: box.entry.href + ':conn', d }
    })
  }

  function pointsToCentripetalCatmullRomPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return ''
    const dedup: { x: number; y: number }[] = []
    for (const p of pts) {
      const last = dedup[dedup.length - 1]
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.5) dedup.push(p)
    }
    if (dedup.length < 2) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
    let d = `M ${dedup[0].x.toFixed(2)} ${dedup[0].y.toFixed(2)} `
    const n = dedup.length
    const alpha = 0.5
    for (let i = 0; i < n - 1; i++) {
      const p0 = dedup[Math.max(0, i - 1)]
      const p1 = dedup[i]
      const p2 = dedup[i + 1]
      const p3 = dedup[Math.min(n - 1, i + 2)]
      const d01 = Math.pow(Math.hypot(p1.x - p0.x, p1.y - p0.y), alpha)
      const d12 = Math.pow(Math.hypot(p2.x - p1.x, p2.y - p1.y), alpha)
      const d23 = Math.pow(Math.hypot(p3.x - p2.x, p3.y - p2.y), alpha)
      const denom1 = d01 + d12
      const denom2 = d12 + d23
      const t1x = denom1 > 0 ? (p2.x - p0.x) * d12 / denom1 : p2.x - p1.x
      const t1y = denom1 > 0 ? (p2.y - p0.y) * d12 / denom1 : p2.y - p1.y
      const t2x = denom2 > 0 ? (p3.x - p1.x) * d12 / denom2 : p2.x - p1.x
      const t2y = denom2 > 0 ? (p3.y - p1.y) * d12 / denom2 : p2.y - p1.y
      const cp1x = p1.x + t1x / 3
      const cp1y = p1.y + t1y / 3
      const cp2x = p2.x - t2x / 3
      const cp2y = p2.y - t2y / 3
      d += `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `
    }
    return d
  }

  function buildClusterEdges(
    rows: RowLayout[],
    w: number,
    getSpinePoint: (date: string | undefined) => { x: number; y: number } | null
  ): ClusterEdge[] {
    if (!rows.length || w <= 0) return []
    const edges: ClusterEdge[] = []

    const globalBoxesByHref = new Map<string, NodeBox>()
    for (const r of rows) for (const b of r.boxes) globalBoxesByHref.set(b.entry.href, b)

    for (const r of rows) {
      for (const box of r.boxes) {
        if (box.entry.parent) {
          const parent = globalBoxesByHref.get(box.entry.parent)
          if (parent) {
            const px = parent.x + parent.w / 2
            const py = parent.y + parent.h
            const cxx = box.x + box.w / 2
            const cyy = box.y
            const midY = (py + cyy) / 2
            edges.push({
              d: `M ${px.toFixed(2)} ${py.toFixed(2)} C ${px.toFixed(2)} ${midY.toFixed(2)}, ${cxx.toFixed(2)} ${midY.toFixed(2)}, ${cxx.toFixed(2)} ${cyy.toFixed(2)}`,
              kind: 'parent-child'
            })
          }
        }

        if (typeof box.anchorX === 'number' && typeof box.anchorY === 'number' && box.anchorSide) {
          const boxCy = box.y + box.h / 2
          const edgeX = box.anchorSide === 'left' ? box.x + box.w : box.x
          edges.push({
            d: `M ${edgeX.toFixed(2)} ${boxCy.toFixed(2)} L ${box.anchorX.toFixed(2)} ${box.anchorY.toFixed(2)}`,
            kind: box.depth === 0 ? 'branch' : 'child-branch'
          })
        }
      }
    }

    return edges
  }

  function progressForDate(iso: string): number {
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t) || entries.length === 0) return 0
    const span = dateBounds.end - dateBounds.start
    if (span <= 0) return 0.5
    return Math.max(0, Math.min(1, (t - dateBounds.start) / span))
  }

  function pointAt(progress: number): { x: number; y: number; angle: number } {
    if (!spinePathEl || totalLength === 0) return { x: (trackWidth || 1100) / 2, y: 0, angle: 0 }
    const rows = layout.rows
    let tailLen = 0
    let headLen = 0
    if (rows.length > 0) {
      const oldestMid = rows[0].rowMid
      const planetApexY = Math.max(oldestMid + 80, trackHeight - SPINE_BOTTOM_BUFFER)
      tailLen = planetApexY - oldestMid + 80
      headLen = 120
    }
    const timelineLen = Math.max(1, totalLength - headLen - tailLen)
    const clampedP = Math.max(0, Math.min(1, progress))
    const len = tailLen + clampedP * timelineLen
    const p = spinePathEl.getPointAtLength(len)
    const p2 = spinePathEl.getPointAtLength(Math.min(totalLength, len + 1))
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

  function onNodeEnter(entry: RoadmapEntry, side: 'left' | 'right', ev: Event) {
    hoverHref = entry.href
    const el = ev.currentTarget as HTMLElement | null
    if (el) positionAside(el, side)
  }

  function onNodeLeave() {
    hoverHref = null
  }

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
    const headerH =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--np-header-height')) || 0
    let top = rect.top
    top = Math.max(headerH + margin, Math.min(window.innerHeight - asideHeightEstimate - margin, top))
    asideTop = top
    asideLeft = left
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
    navigate(entry.href)
  }

  function measure() {
    if (!track) return
    trackHeight = track.offsetHeight
    trackWidth = track.offsetWidth
  }

  function measureLength() {
    if (!spinePathEl) return
    totalLength = spinePathEl.getTotalLength()
  }

  let travelFrame = 0
  function travel() {
    if (!entries.length || !track || !spinePathEl || totalLength === 0) return
    cancelAnimationFrame(travelFrame)
    const target = progressForDate(now)
    const start = 0
    const duration = 4200
    const trackTop = track.offsetTop
    rocketProgress = start
    flying = true
    const startPoint = spinePathEl.getPointAtLength(0)
    const initialScrollY = Math.max(0, trackTop + startPoint.y - window.innerHeight * 0.55)
    window.scrollTo({ top: initialScrollY, behavior: 'smooth' })
    setTimeout(() => {
      const t0 = performance.now()
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        rocketProgress = start + (target - start) * eased
        if (spinePathEl) {
          const pos = spinePathEl.getPointAtLength(rocketProgress * totalLength)
          const rocketPageY = trackTop + pos.y
          const desired = window.innerHeight * 0.55
          const currentRocketScreenY = rocketPageY - window.scrollY
          const delta = currentRocketScreenY - desired
          if (Math.abs(delta) > 1) window.scrollTo(0, Math.max(0, window.scrollY + delta))
        }
        if (p < 1) {
          travelFrame = requestAnimationFrame(step)
        } else {
          flying = false
        }
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
        measureLength()
        rocketProgress = progressForDate(now)
        if (spinePathEl && totalLength > 0) {
          const pt = spinePathEl.getPointAtLength(rocketProgress * totalLength)
          const scrollY = pt.y + (track?.offsetTop ?? 0) - window.innerHeight / 2
          window.scrollTo({ top: Math.max(0, scrollY), behavior: 'auto' })
        }
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
    spinePath
    tick().then(measureLength)
  })

  $effect(() => {
    if (!flying) rocketProgress = progressForDate(now)
  })

  $effect(() => {
    page.slug
    void hydrate()
  })
</script>

{#if renderBackground}
  <div class="np-page-background" style:background-image={`url('${background}')`}></div>
{/if}
<div class="np-page-shell np-roadmap-shell">
  <div class="np-page np-roadmap-page">
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

    <div class="np-roadmap-track" bind:this={track} style:height={`${layout.totalH + 64}px`}>
      <svg
        class="np-roadmap-edges"
        viewBox={`0 0 ${trackWidth || 1100} ${layout.totalH + 64}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {#each edgeList as e (e.id)}
          <path d={e.d} class="np-roadmap-edge" />
        {/each}
        {#each spineConnectors as c (c.id)}
          <path d={c.d} class="np-roadmap-spine-connector" />
        {/each}
        {#if spinePath}
          <path d={spinePath} class="np-roadmap-spine-path" bind:this={spinePathEl} />
        {/if}
      </svg>

      {#each layout.rows as r (r.rootEntry.href)}
        {#each r.boxes as b (b.entry.href)}
          <RoadmapNode
            entry={b.entry}
            side={r.side}
            x={b.x}
            y={b.y}
            w={b.w}
            h={b.h}
            onClick={(e) => onNodeClick(b.entry, e)}
            onEnter={(e) => onNodeEnter(b.entry, r.side, e)}
            onLeave={onNodeLeave}
            onMeasure={recordMeasure}
          />
        {/each}
      {/each}

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
    grid-template-columns: minmax(0, var(--np-content-max));
    justify-content: center;
    width: 100%;
  }
  .np-roadmap-page {
    padding: 0;
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
    margin: 0 auto;
    padding: 56px 48px 40px;
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
    padding: 32px 24px 0;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
    min-height: 600px;
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
    stroke: var(--np-border, #444);
    stroke-width: 1.5;
    opacity: 0.55;
  }
  .np-roadmap-spine-path {
    fill: none;
    stroke: var(--np-brand, #b9b);
    stroke-width: 2;
    stroke-dasharray: 6 6;
    opacity: 0.7;
  }
  .np-roadmap-spine-connector {
    fill: none;
    stroke: var(--np-brand, #b9b);
    stroke-width: 1.5;
    opacity: 0.55;
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
  .np-roadmap-spine-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
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
  .np-rm-edge {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .np-rm-edge-parent-child {
    stroke: color-mix(in srgb, var(--np-brand) 50%, transparent);
    stroke-width: 1.4;
    stroke-dasharray: 3 4;
    opacity: 0.85;
  }
  .np-rm-edge-branch {
    stroke: color-mix(in srgb, var(--np-text-muted) 75%, transparent);
    stroke-width: 1.6;
    stroke-dasharray: 2 6;
    opacity: 0.9;
  }
  .np-rm-edge-child-branch {
    stroke: color-mix(in srgb, var(--np-text-muted) 45%, transparent);
    stroke-width: 1;
    stroke-dasharray: 1 5;
    opacity: 0.7;
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
    transition: top 0.4s ease, left 0.4s ease, transform 0.4s ease;
    filter: drop-shadow(0 6px 18px color-mix(in srgb, var(--np-brand) 35%, transparent));
  }
  .np-roadmap-rocket.flying {
    transition: none;
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
    .np-roadmap-hero { padding: 32px 20px 24px; }
    .np-roadmap-hero-title { font-size: 38px; }
    .np-roadmap-hero-tagline { font-size: 18px; }
    .np-roadmap-track { padding: 16px 0 60px; }
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
