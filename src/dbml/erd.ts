import { exporter } from '@dbml/core'

const ROW_HEIGHT = 27
const INDEX_LINE = 14
const INDEX_PADDING = 16
const HEADER_PADDING = 20
const HEADER_LINE = 17
const HEADER_NOTE_LINE = 14
const TABLE_GAP_X = 110
const TABLE_GAP_Y = 60
const COMPONENT_GAP_Y = 120
const CANVAS_MARGIN = 40
const TABLE_MIN_WIDTH = 200
const TABLE_MAX_WIDTH = 420
const TABLE_SIDE_PADDING = 24
const NAME_CHAR = 7.6
const TYPE_CHAR = 6.6
const HEADER_CHAR = 7.4
const HEADER_NOTE_CHAR = 5.4
const INDEX_CHAR = 5.8
const LINK_CHAR = 6.2
const FLAG_WIDTH = 34
const TABLE_CHROME = 48
const COLUMN_LIMIT = 8
const NOTE_WIDTH = 260
const NOTE_LINE = 18
const NOTE_CHAR = 6.2
const NOTE_TITLE_HEIGHT = 30
const NOTE_PADDING = 24
const NOTE_GAP = 24

interface DbmlType {
  type_name?: string
  args?: string | null
  schemaName?: string | null
}

interface DbmlField {
  id: number
  name: string
  type?: DbmlType
  unique?: boolean
  pk?: boolean
  not_null?: boolean
  increment?: boolean
  note?: string | null
  dbdefault?: { value: string | number | boolean; type: string } | null
  tableId: number
}

interface DbmlTable {
  id: number
  name: string
  note?: string | null
  headerColor?: string | null
  fieldIds: number[]
  indexIds: number[]
  schemaId: number
}

interface DbmlIndex {
  id: number
  name?: string | null
  unique?: boolean
  pk?: boolean
  columnIds: number[]
  tableId: number
}

interface DbmlIndexColumn {
  id: number
  type: string
  value: string
  indexId: number
}

interface DbmlEndpoint {
  id: number
  tableName: string
  fieldNames: string[]
  relation: string
  refId: number
  fieldIds: number[]
}

interface DbmlRef {
  id: number
  name?: string | null
  endpointIds: number[]
}

interface DbmlSchema {
  id: number
  name: string
  tableIds: number[]
  refIds: number[]
}

interface DbmlNote {
  id: number
  name?: string | null
  content?: string | null
}

interface DbmlDatabase {
  id: number
  name?: string | null
  databaseType?: string | null
}

interface DbmlModel {
  database: Record<string, DbmlDatabase>
  schemas: Record<string, DbmlSchema>
  tables: Record<string, DbmlTable>
  fields: Record<string, DbmlField>
  indexes: Record<string, DbmlIndex>
  indexColumns: Record<string, DbmlIndexColumn>
  refs: Record<string, DbmlRef>
  endpoints: Record<string, DbmlEndpoint>
  notes: Record<string, DbmlNote>
}

export interface ErdColumn {
  name: string
  type: string
  note: string
  default: string
  pk: boolean
  fk: boolean
  unique: boolean
  notNull: boolean
  increment: boolean
  link: string
  linkLabel: string
  target: string
}

export interface ErdIndex {
  name: string
  columns: string[]
  unique: boolean
}

export interface ErdTable {
  id: string
  name: string
  note: string
  color: string
  columns: ErdColumn[]
  indexes: ErdIndex[]
  x: number
  y: number
  width: number
  height: number
}

export interface ErdEdge {
  id: string
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
  many: boolean
}

export interface ErdNote {
  id: string
  title: string
  body: string
  x: number
  y: number
  width: number
  height: number
}

export interface ErdDiagram {
  database: string
  tables: ErdTable[]
  edges: ErdEdge[]
  notes: ErdNote[]
}

export class DbmlError extends Error {}

function formatDbmlError(err: unknown): string {
  const diags = (err as { diags?: Array<Record<string, unknown>> })?.diags
  if (Array.isArray(diags) && diags.length) {
    return diags
      .map((d) => {
        const loc = d.location as { start?: { line?: number; column?: number } } | undefined
        const line = loc?.start?.line
        const column = loc?.start?.column
        const where = line ? `line ${line}${column ? `, column ${column}` : ''}: ` : ''
        return `${where}${String(d.message ?? 'invalid dbml')}`
      })
      .join('\n')
  }
  return err instanceof Error ? err.message : String(err)
}

function parseModel(source: string): DbmlModel {
  try {
    return JSON.parse(exporter.export(source, 'json')) as DbmlModel
  } catch (err) {
    throw new DbmlError(formatDbmlError(err))
  }
}

function typeText(field: DbmlField): string {
  const name = field.type?.type_name ?? ''
  return name.trim()
}

function defaultText(field: DbmlField): string {
  const raw = field.dbdefault
  if (!raw || raw.value === undefined || raw.value === null) return ''
  return String(raw.value)
}

const NOTE_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/

interface NoteLink {
  note: string
  label: string
  href: string
}

function readNoteLink(raw: string): NoteLink {
  const text = String(raw ?? '').trim()
  const match = NOTE_LINK.exec(text)
  if (!match) return { note: text, label: '', href: '' }
  return {
    note: text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim(),
    label: match[1].trim(),
    href: match[2].trim()
  }
}

function lineCount(text: string, charWidth: number, boxWidth: number): number {
  if (!text) return 0
  const perLine = Math.max(1, Math.floor(boxWidth / charWidth))
  return text
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.trim().length / perLine)), 0)
}

function longest(values: string[]): number {
  return values.reduce((max, value) => Math.max(max, value.length), 0)
}

function tableWidth(name: string, columns: ErdColumn[]): number {
  const nameWidth = longest(columns.map((c) => c.name)) * NAME_CHAR
  const typeWidth = longest(columns.map((c) => c.type)) * TYPE_CHAR
  const linkWidth = longest(columns.map((c) => c.linkLabel)) * LINK_CHAR
  const flags = columns.some((c) => c.pk || c.fk) ? FLAG_WIDTH : 0
  const body = Math.round(nameWidth + typeWidth + linkWidth + flags + TABLE_CHROME)
  const header = Math.round(name.length * HEADER_CHAR + 32)
  return Math.min(TABLE_MAX_WIDTH, Math.max(TABLE_MIN_WIDTH, body, header))
}

function tableHeight(table: ErdTable): number {
  const inner = table.width - TABLE_SIDE_PADDING
  const headLines = Math.max(1, lineCount(table.name, HEADER_CHAR, inner))
  const noteLines = lineCount(table.note, HEADER_NOTE_CHAR, inner)
  const head = HEADER_PADDING + headLines * HEADER_LINE + noteLines * HEADER_NOTE_LINE
  const rows = Math.max(table.columns.length, 1) * ROW_HEIGHT
  const indexLines = table.indexes.reduce(
    (sum, index) =>
      sum + lineCount(`${index.unique ? 'unique' : 'index'} ${index.columns.join(', ')}`, INDEX_CHAR, inner),
    0
  )
  const indexes = table.indexes.length ? INDEX_PADDING + indexLines * INDEX_LINE : 0
  return Math.round(head + rows + indexes + 2)
}

function noteHeight(note: ErdNote): number {
  const inner = note.width - NOTE_PADDING
  const bodyLines = lineCount(note.body, NOTE_CHAR, inner)
  const title = note.title ? NOTE_TITLE_HEIGHT : 0
  return Math.round(NOTE_PADDING + title + Math.max(1, bodyLines) * NOTE_LINE)
}

interface Box {
  x: number
  y: number
  width: number
  height: number
}

function overlaps(a: Box, b: Box, gap: number): boolean {
  return (
    a.x < b.x + b.width + gap &&
    b.x < a.x + a.width + gap &&
    a.y < b.y + b.height + gap &&
    b.y < a.y + a.height + gap
  )
}

function separate(boxes: Box[], gap: number): void {
  const order = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x)
  for (let i = 1; i < order.length; i++) {
    let moved = true
    let guard = 0
    while (moved && guard < order.length) {
      moved = false
      guard += 1
      for (let j = 0; j < i; j++) {
        if (!overlaps(order[i], order[j], gap)) continue
        order[i].y = order[j].y + order[j].height + gap
        moved = true
      }
    }
  }
}

function componentsOf(tables: ErdTable[], links: Array<[string, string]>): ErdTable[][] {
  const neighbours = new Map<string, Set<string>>()
  for (const table of tables) neighbours.set(table.id, new Set())
  for (const [a, b] of links) {
    if (a === b) continue
    neighbours.get(a)?.add(b)
    neighbours.get(b)?.add(a)
  }
  const byId = new Map(tables.map((table) => [table.id, table]))
  const seen = new Set<string>()
  const groups: ErdTable[][] = []
  const roots = [...tables].sort(
    (a, b) => (neighbours.get(b.id)?.size ?? 0) - (neighbours.get(a.id)?.size ?? 0)
  )
  for (const root of roots) {
    if (seen.has(root.id)) continue
    const group: ErdTable[] = []
    const queue = [root.id]
    seen.add(root.id)
    while (queue.length) {
      const current = queue.shift() as string
      const table = byId.get(current)
      if (table) group.push(table)
      const next = [...(neighbours.get(current) ?? [])].sort(
        (a, b) => (neighbours.get(b)?.size ?? 0) - (neighbours.get(a)?.size ?? 0)
      )
      for (const id of next) {
        if (seen.has(id)) continue
        seen.add(id)
        queue.push(id)
      }
    }
    groups.push(group)
  }
  return groups
}

function levelsOf(group: ErdTable[], links: Array<[string, string]>): ErdTable[][] {
  const ids = new Set(group.map((table) => table.id))
  const neighbours = new Map<string, Set<string>>()
  for (const table of group) neighbours.set(table.id, new Set())
  for (const [a, b] of links) {
    if (a === b || !ids.has(a) || !ids.has(b)) continue
    neighbours.get(a)?.add(b)
    neighbours.get(b)?.add(a)
  }
  const depth = new Map<string, number>()
  const root = group[0]
  depth.set(root.id, 0)
  const queue = [root.id]
  while (queue.length) {
    const current = queue.shift() as string
    for (const next of neighbours.get(current) ?? []) {
      if (depth.has(next)) continue
      depth.set(next, (depth.get(current) ?? 0) + 1)
      queue.push(next)
    }
  }
  const byDepth = new Map<number, ErdTable[]>()
  for (const table of group) {
    const level = depth.get(table.id) ?? 0
    const list = byDepth.get(level) ?? []
    list.push(table)
    byDepth.set(level, list)
  }
  const columns: ErdTable[][] = []
  for (const level of [...byDepth.keys()].sort((a, b) => a - b)) {
    const tables = byDepth.get(level) ?? []
    for (let start = 0; start < tables.length; start += COLUMN_LIMIT) {
      columns.push(tables.slice(start, start + COLUMN_LIMIT))
    }
  }
  return columns
}

function placeTables(tables: ErdTable[], links: Array<[string, string]>): ErdTable[] {
  const placed: ErdTable[] = []
  let cursorY = CANVAS_MARGIN
  for (const group of componentsOf(tables, links)) {
    let cursorX = CANVAS_MARGIN
    let bottom = cursorY
    for (const column of levelsOf(group, links)) {
      const columnWidth = Math.max(...column.map((table) => table.width))
      let y = cursorY
      for (const table of column) {
        table.x = cursorX + Math.round((columnWidth - table.width) / 2)
        table.y = y
        y += table.height + TABLE_GAP_Y
        bottom = Math.max(bottom, table.y + table.height)
        placed.push(table)
      }
      cursorX += columnWidth + TABLE_GAP_X
    }
    cursorY = bottom + COMPONENT_GAP_Y
  }
  return placed
}

export function dbmlToDiagram(source: string): ErdDiagram {
  const model = parseModel(source)
  const database = Object.values(model.database)[0]

  const schemaNameByTableId = new Map<number, string>()
  const rawTableIds: number[] = []
  for (const schema of Object.values(model.schemas).sort((a, b) => a.id - b.id)) {
    for (const tableId of schema.tableIds) {
      rawTableIds.push(tableId)
      schemaNameByTableId.set(tableId, schema.name)
    }
  }

  const compositeKeys = new Set<number>()
  for (const index of Object.values(model.indexes)) {
    if (!index.pk) continue
    const table = model.tables[String(index.tableId)]
    if (!table) continue
    for (const columnId of index.columnIds) {
      const indexColumn = model.indexColumns[String(columnId)]
      if (!indexColumn || indexColumn.type !== 'column') continue
      const field = table.fieldIds
        .map((fieldId) => model.fields[String(fieldId)])
        .find((f) => f && f.name === indexColumn.value)
      if (field) compositeKeys.add(field.id)
    }
  }

  const tables: ErdTable[] = []
  const tableById = new Map<string, ErdTable>()
  const tableIdByName = new Map<string, string>()
  const columnIndexByField = new Map<number, number>()
  const tableIdByField = new Map<number, string>()

  for (const rawTableId of rawTableIds) {
    const raw = model.tables[String(rawTableId)]
    if (!raw) continue
    const schemaName = schemaNameByTableId.get(rawTableId) ?? 'public'
    const name = schemaName === 'public' ? raw.name : `${schemaName}.${raw.name}`
    const id = `table-${rawTableId}`

    const columns: ErdColumn[] = []
    raw.fieldIds.forEach((fieldId) => {
      const field = model.fields[String(fieldId)]
      if (!field) return
      const pk = Boolean(field.pk) || compositeKeys.has(field.id)
      const noteLink = readNoteLink(field.note ?? '')
      columnIndexByField.set(field.id, columns.length)
      tableIdByField.set(field.id, id)
      columns.push({
        name: field.name,
        type: typeText(field),
        note: noteLink.note,
        default: defaultText(field),
        pk,
        fk: false,
        unique: Boolean(field.unique),
        notNull: pk || Boolean(field.not_null),
        increment: Boolean(field.increment),
        link: noteLink.href,
        linkLabel: noteLink.label,
        target: ''
      })
    })

    const indexes: ErdIndex[] = []
    for (const rawIndexId of raw.indexIds) {
      const index = model.indexes[String(rawIndexId)]
      if (!index || index.pk) continue
      const columnNames = index.columnIds
        .map((columnId) => model.indexColumns[String(columnId)])
        .filter((indexColumn) => indexColumn && indexColumn.type === 'column')
        .map((indexColumn) => indexColumn.value)
      if (!columnNames.length) continue
      indexes.push({
        name: index.name ?? `${raw.name}_index_${index.id}`,
        columns: columnNames,
        unique: Boolean(index.unique)
      })
    }

    const table: ErdTable = {
      id,
      name,
      note: raw.note ?? '',
      color: raw.headerColor ?? '',
      columns,
      indexes,
      x: 0,
      y: 0,
      width: tableWidth(name, columns),
      height: 0
    }
    table.height = tableHeight(table)
    tables.push(table)
    tableById.set(id, table)
    tableIdByName.set(raw.name, id)
    tableIdByName.set(name, id)
  }

  for (const table of tables) {
    for (const column of table.columns) {
      if (!column.link) continue
      const bare = column.link.replace(/^#/, '')
      const targetId = tableIdByName.get(bare) ?? tableIdByName.get(column.link)
      if (!targetId || targetId === table.id) continue
      column.target = targetId
      column.link = ''
    }
  }

  interface Link {
    id: string
    parent: string
    parentColumn: number
    child: string
    childColumn: number
    many: boolean
  }

  const links: Link[] = []
  for (const ref of Object.values(model.refs).sort((a, b) => a.id - b.id)) {
    const ends = ref.endpointIds.map((endpointId) => model.endpoints[String(endpointId)]).filter(Boolean)
    if (ends.length !== 2) continue
    const parentIndex = ends[1].relation === '1' ? 1 : ends[0].relation === '1' ? 0 : 1
    const parent = ends[parentIndex]
    const child = ends[parentIndex === 0 ? 1 : 0]
    const parentField = parent.fieldIds[0]
    const childField = child.fieldIds[0]
    if (parentField === undefined || childField === undefined) continue
    const parentTableId = tableIdByField.get(parentField) ?? tableIdByName.get(parent.tableName)
    const childTableId = tableIdByField.get(childField) ?? tableIdByName.get(child.tableName)
    if (!parentTableId || !childTableId) continue
    for (const fieldId of child.fieldIds) {
      const table = tableById.get(tableIdByField.get(fieldId) ?? '')
      const columnIndex = columnIndexByField.get(fieldId)
      if (!table || columnIndex === undefined) continue
      const column = table.columns[columnIndex]
      column.fk = true
      if (!column.target && !column.link) column.target = parentTableId
    }
    links.push({
      id: `edge-${ref.id}`,
      parent: parentTableId,
      parentColumn: columnIndexByField.get(parentField) ?? 0,
      child: childTableId,
      childColumn: columnIndexByField.get(childField) ?? 0,
      many: child.relation !== '1'
    })
  }

  const ordered = placeTables(
    tables,
    links.map((link) => [link.parent, link.child] as [string, string])
  )
  const laidOut = ordered.length ? ordered : tables

  const notes: ErdNote[] = []
  const widest = laidOut.reduce((max, table) => Math.max(max, table.x + table.width), CANVAS_MARGIN)
  let noteY = CANVAS_MARGIN
  const noteX = widest + CANVAS_MARGIN + TABLE_GAP_X
  for (const raw of Object.values(model.notes).sort((a, b) => a.id - b.id)) {
    const body = String(raw.content ?? '').trim()
    if (!body) continue
    const note: ErdNote = {
      id: `note-${raw.id}`,
      title: raw.name ?? '',
      body,
      x: noteX,
      y: noteY,
      width: NOTE_WIDTH,
      height: 0
    }
    note.height = noteHeight(note)
    notes.push(note)
    noteY += note.height + NOTE_GAP
  }

  separate([...laidOut, ...notes], NOTE_GAP)

  const edges: ErdEdge[] = []
  for (const link of links) {
    const parent = tableById.get(link.parent)
    const child = tableById.get(link.child)
    if (!parent || !child) continue
    const parentSide = parent.x + parent.width / 2 <= child.x + child.width / 2 ? 'r' : 'l'
    const childSide = parentSide === 'r' ? 'l' : 'r'
    edges.push({
      id: link.id,
      source: parent.id,
      sourceHandle: `${parentSide}-${link.parentColumn}`,
      target: child.id,
      targetHandle: `${childSide}-${link.childColumn}`,
      many: link.many
    })
  }

  return {
    database: database?.name ?? '',
    tables: laidOut,
    edges,
    notes
  }
}

export function dbmlToErdJson(source: string): string {
  return JSON.stringify(dbmlToDiagram(source))
}
