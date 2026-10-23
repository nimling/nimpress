import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseD2, D2Error } from '../src/d2/parse'
import { d2ToDiagram, layered, outlinePath, type D2Shape } from '../src/d2/diagram'

const file = '/docs/page.md'

function shape(shapes: D2Shape[], id: string): D2Shape {
  const found = shapes.find((s) => s.id === id)
  if (!found) throw new Error(`no shape ${id}`)
  return found
}

function overlaps(a: D2Shape, b: D2Shape): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

describe('parseD2', () => {
  it('declares shapes with labels, keywords and nested containers', () => {
    const graph = parseD2(
      `
# a comment
server: Web server
server.shape: cylinder
cloud: {
  label: AWS
  db: "Postgres # primary"
  db.style.fill: "#ffeedd"
}
`,
      file
    )
    expect(graph.nodes.get('server')?.label).toBe('Web server')
    expect(graph.nodes.get('server')?.attrs.shape).toBe('cylinder')
    expect(graph.nodes.get('cloud')?.label).toBe('AWS')
    expect(graph.nodes.get('cloud.db')?.label).toBe('Postgres # primary')
    expect(graph.nodes.get('cloud.db')?.parent).toBe('cloud')
    expect(graph.nodes.get('cloud.db')?.attrs['style.fill']).toBe('#ffeedd')
  })

  it('reads connection chains, directions, labels and blocks', () => {
    const graph = parseD2(
      `
a -> b -> c: calls
d <- e
f <-> g
h -- i {
  style.stroke-dash: 3
  target-arrowhead.shape: diamond
}
`,
      file
    )
    const pairs = graph.connections.map((c) => [c.source, c.target, c.sourceArrow, c.targetArrow, c.label])
    expect(pairs).toEqual([
      ['a', 'b', false, true, 'calls'],
      ['b', 'c', false, true, 'calls'],
      ['e', 'd', false, true, ''],
      ['f', 'g', true, true, ''],
      ['h', 'i', false, false, '']
    ])
    expect(graph.connections[4].attrs).toEqual({ 'style.stroke-dash': '3', 'target-arrowhead.shape': 'diamond' })
  })

  it('resolves keys with spaces, quotes, the parent reference and connection scope', () => {
    const graph = parseD2(
      `
group: {
  load balancer -> "api.v1"
  api.v1 -> _.outside
}
`,
      file
    )
    expect(graph.nodes.has('group.load balancer')).toBe(true)
    expect(graph.nodes.has('group.api.v1')).toBe(true)
    expect(graph.connections.map((c) => `${c.source} > ${c.target}`)).toEqual([
      'group.load balancer > group.api.v1',
      'group.api.v1 > outside'
    ])
  })

  it('substitutes vars, applies classes and styles indexed connections', () => {
    const graph = parseD2(
      `
vars: {
  region: eu-north-1
}
classes: {
  store: {
    shape: cylinder
    style.fill: "#eef"
  }
}
db: Store in \${region}
db.class: store
a -> db
(a -> db)[0].style.stroke: red
`,
      file
    )
    expect(graph.nodes.get('db')?.label).toBe('Store in eu-north-1')
    expect(graph.nodes.get('db')?.classes).toEqual(['store'])
    expect(graph.classes.get('store')?.attrs).toEqual({ shape: 'cylinder', 'style.fill': '#eef' })
    expect(graph.connections[0].attrs['style.stroke']).toBe('red')
  })

  it('reads block strings and removes a shape declared null', () => {
    const graph = parseD2(
      `
explain: |md
  # Title
  Some **bold** text
|
gone: here
gone -> explain
gone: null
`,
      file
    )
    expect(graph.nodes.get('explain')?.label).toBe('# Title\nSome **bold** text')
    expect(graph.nodes.has('gone')).toBe(false)
    expect(graph.connections).toHaveLength(0)
  })

  it('imports files relative to the importing file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nimpress-d2-'))
    writeFileSync(join(dir, 'shared.d2'), 'shape: hexagon\nlabel: Shared')
    writeFileSync(join(dir, 'more.d2'), 'x -> y')
    const graph = parseD2('svc: @shared\n...@more', join(dir, 'page.md'))
    expect(graph.nodes.get('svc')?.attrs.shape).toBe('hexagon')
    expect(graph.nodes.get('svc')?.label).toBe('Shared')
    expect(graph.connections.map((c) => `${c.source}>${c.target}`)).toEqual(['x>y'])
    expect(graph.files).toEqual([join(dir, 'shared.d2'), join(dir, 'more.d2')])
  })

  it('reports syntax errors with the file and line', () => {
    expect(() => parseD2('a -> b\nc -> {', file)).toThrow(D2Error)
    expect(() => parseD2('a -> b\nc -> {', file)).toThrow(/page\.md:2:/)
    expect(() => parseD2('x: @missing', file)).toThrow(/failed to import "missing"/)
  })
})

describe('layered', () => {
  it('ranks a chain top to bottom and left to right', () => {
    const nodes = ['a', 'b', 'c'].map((id) => ({ id, width: 80, height: 40 }))
    const edges = [
      { key: 0, source: 'a', target: 'b', labelWidth: 0, labelHeight: 0 },
      { key: 1, source: 'b', target: 'c', labelWidth: 0, labelHeight: 0 }
    ]
    const down = layered(nodes, edges, 'down')
    expect(down.center.get('a')!.y).toBeLessThan(down.center.get('b')!.y)
    expect(down.center.get('b')!.y).toBeLessThan(down.center.get('c')!.y)
    const right = layered(nodes, edges, 'right')
    expect(right.center.get('a')!.x).toBeLessThan(right.center.get('b')!.x)
    expect(right.center.get('a')!.y).toBe(right.center.get('c')!.y)
    const up = layered(nodes, edges, 'up')
    expect(up.center.get('a')!.y).toBeGreaterThan(up.center.get('c')!.y)
  })

  it('survives cycles and routes long edges through the skipped ranks', () => {
    const nodes = ['a', 'b', 'c'].map((id) => ({ id, width: 80, height: 40 }))
    const edges = [
      { key: 0, source: 'a', target: 'b', labelWidth: 0, labelHeight: 0 },
      { key: 1, source: 'b', target: 'c', labelWidth: 0, labelHeight: 0 },
      { key: 2, source: 'c', target: 'a', labelWidth: 0, labelHeight: 0 },
      { key: 3, source: 'a', target: 'c', labelWidth: 30, labelHeight: 18 }
    ]
    const result = layered(nodes, edges, 'down')
    expect(result.routes.get(2)!.points[0]).toEqual(result.center.get('c'))
    expect(result.routes.get(3)!.points).toHaveLength(3)
    expect(result.routes.get(3)!.label).not.toBeNull()
  })

  it('removes crossings between two ranks', () => {
    const nodes = ['a', 'b', 'x', 'y'].map((id) => ({ id, width: 60, height: 40 }))
    const edges = [
      { key: 0, source: 'a', target: 'y', labelWidth: 0, labelHeight: 0 },
      { key: 1, source: 'b', target: 'x', labelWidth: 0, labelHeight: 0 }
    ]
    const result = layered(nodes, edges, 'down')
    const order = (a: string, b: string) => Math.sign(result.center.get(a)!.x - result.center.get(b)!.x)
    expect(order('a', 'b')).toBe(order('y', 'x'))
  })
})

describe('d2ToDiagram', () => {
  it('lays out shapes without overlap and routes edges between them', () => {
    const diagram = d2ToDiagram('a -> b\na -> c\nb -> d\nc -> d: joins', file)
    const leaves = diagram.shapes
    for (let i = 0; i < leaves.length; i++) {
      for (let j = i + 1; j < leaves.length; j++) expect(overlaps(leaves[i], leaves[j])).toBe(false)
    }
    expect(diagram.edges).toHaveLength(4)
    expect(diagram.edges.every((e) => e.path.startsWith('M'))).toBe(true)
    expect(diagram.edges[3].label).toEqual(['joins'])
    expect(diagram.edges[0].target.kind).toBe('triangle')
    expect(diagram.edges[0].source.kind).toBe('none')
    for (const s of leaves) {
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.x + s.width).toBeLessThanOrEqual(diagram.width)
      expect(s.y + s.height).toBeLessThanOrEqual(diagram.height)
    }
  })

  it('wraps container children inside the container below its label', () => {
    const diagram = d2ToDiagram('cloud: AWS {\n  api -> db\n}\nuser -> cloud.api', file)
    const cloud = shape(diagram.shapes, 'cloud')
    expect(cloud.container).toBe(true)
    for (const id of ['cloud.api', 'cloud.db']) {
      const child = shape(diagram.shapes, id)
      expect(child.level).toBe(2)
      expect(child.x).toBeGreaterThan(cloud.x)
      expect(child.y).toBeGreaterThan(cloud.labelY)
      expect(child.x + child.width).toBeLessThan(cloud.x + cloud.width)
      expect(child.y + child.height).toBeLessThan(cloud.y + cloud.height)
    }
    expect(overlaps(shape(diagram.shapes, 'user'), cloud)).toBe(false)
    expect(diagram.shapes.map((s) => s.id)).toEqual(['cloud', 'cloud.api', 'cloud.db', 'user'])
  })

  it('ends an edge on the boundary of the shape it connects', () => {
    const diagram = d2ToDiagram('a -> b', file)
    const b = shape(diagram.shapes, 'b')
    const end = /(-?[\d.]+),(-?[\d.]+)$/.exec(diagram.edges[0].path)!
    expect(Number(end[2])).toBeCloseTo(b.y, 0)
  })

  it('turns sql_table children into rows and anchors edges on them', () => {
    const diagram = d2ToDiagram(
      `
users: {
  shape: sql_table
  id: uuid {constraint: primary_key}
  email: text {constraint: unique}
}
orders: {
  shape: sql_table
  id: uuid {constraint: primary_key}
  user_id: uuid {constraint: foreign_key}
}
orders.user_id -> users.id
`,
      file
    )
    const users = shape(diagram.shapes, 'users')
    expect(users.kind).toBe('sql_table')
    expect(users.container).toBe(false)
    expect(users.rows.map((r) => [r.name, r.type, r.constraint])).toEqual([
      ['id', 'uuid', 'PK'],
      ['email', 'text', 'UNQ']
    ])
    expect(diagram.shapes.map((s) => s.id)).toEqual(['users', 'orders'])
    expect(diagram.edges).toHaveLength(1)
  })

  it('passes the direction down to containers until one sets its own', () => {
    const diagram = d2ToDiagram('direction: right\ng: {\n  a -> b\n}\nh: {\n  direction: down\n  c -> d\n}', file)
    const [a, b, c, d] = ['g.a', 'g.b', 'h.c', 'h.d'].map((id) => shape(diagram.shapes, id))
    expect(b.x).toBeGreaterThan(a.x + a.width)
    expect(a.y).toBe(b.y)
    expect(d.y).toBeGreaterThan(c.y + c.height)
  })

  it('lays out grid containers in rows and columns', () => {
    const diagram = d2ToDiagram('g: {\n  grid-columns: 2\n  a\n  b\n  c\n}', file)
    const [a, b, c] = ['g.a', 'g.b', 'g.c'].map((id) => shape(diagram.shapes, id))
    expect(a.y).toBe(b.y)
    expect(c.x).toBe(a.x)
    expect(c.y).toBeGreaterThan(a.y)
  })

  it('keeps a near title outside the layout and draws a self loop', () => {
    const diagram = d2ToDiagram('title: Overview {near: top-center; shape: text}\na -> a', file)
    const title = shape(diagram.shapes, 'title')
    const a = shape(diagram.shapes, 'a')
    expect(title.y + title.height).toBeLessThan(a.y)
    expect(title.outline).toBe('')
    expect(diagram.edges[0].path.split('C').length).toBeGreaterThan(1)
  })

  it('reads styles and arrowheads into the model', () => {
    const diagram = d2ToDiagram(
      'a: {style: {fill: "#fde"; stroke-dash: 4; shadow: true; bold: true}}\na -> b: {source-arrowhead.shape: cf-many; target-arrowhead: {shape: diamond; style.filled: true}}',
      file
    )
    expect(shape(diagram.shapes, 'a').style).toEqual({ fill: '#fde', strokeDash: 4, shadow: true, bold: true })
    expect(diagram.edges[0].source).toEqual({ kind: 'cf-many', filled: true, label: '' })
    expect(diagram.edges[0].target).toEqual({ kind: 'diamond', filled: true, label: '' })
  })

  it('collects every imported file for the watcher', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nimpress-d2-'))
    writeFileSync(join(dir, 'box.d2'), 'shape: circle')
    const diagram = d2ToDiagram('a: @box', join(dir, 'page.md'))
    expect(diagram.files).toEqual([join(dir, 'box.d2')])
    expect(shape(diagram.shapes, 'a').kind).toBe('circle')
  })
})

describe('outlinePath', () => {
  it('draws every shape kind as a closed path', () => {
    const kinds = ['rectangle', 'square', 'page', 'parallelogram', 'document', 'cylinder', 'queue', 'package', 'step', 'callout', 'stored_data', 'person', 'diamond', 'oval', 'circle', 'hexagon', 'cloud', 'code', 'sql_table', 'class'] as const
    for (const kind of kinds) expect(outlinePath(kind, 0, 0, 120, 60)).toMatch(/^M.*Z/)
    expect(outlinePath('text', 0, 0, 120, 60)).toBe('')
  })
})
