import { exporter } from '@dbml/core'

const HEADER_HEIGHT = 40
const ROW_HEIGHT = 26
const INDEX_HEIGHT = 20
const TABLE_PADDING = 10
const TABLE_GAP_X = 90
const TABLE_GAP_Y = 70
const CANVAS_MARGIN = 40
const TABLE_MIN_WIDTH = 200
const TABLE_MAX_WIDTH = 400
const NAME_CHAR = 7.6
const TYPE_CHAR = 6.6
const FLAG_WIDTH = 34
const TABLE_CHROME = 48
const NOTE_WIDTH = 260
const NOTE_LINE = 18
const NOTE_MIN_HEIGHT = 90
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

function longest(values: string[]): number {
  return values.reduce((max, value) => Math.max(max, value.length), 0)
}

function tableWidth(name: string, columns: ErdColumn[]): number {
  const nameWidth = longest(columns.map((c) => c.name)) * NAME_CHAR
  const typeWidth = longest(columns.map((c) => c.type)) * TYPE_CHAR
  const flags = columns.some((c) => c.pk || c.fk) ? FLAG_WIDTH : 0
  const body = Math.round(nameWidth + typeWidth + flags + TABLE_CHROME)
  const header = Math.round(name.length * 8 + 32)
  return Math.min(TABLE_MAX_WIDTH, Math.max(TABLE_MIN_WIDTH, body, header))
}

function tableHeight(table: ErdTable): number {
  const rows = HEADER_HEIGHT + Math.max(table.columns.length, 1) * ROW_HEIGHT + TABLE_PADDING
  return table.indexes.length ? rows + 8 + table.indexes.length * INDEX_HEIGHT : rows
}

function orderTables(tables: ErdTable[], links: Array<[string, string]>): ErdTable[] {
  const neighbours = new Map<string, Set<string>>()
  for (const table of tables) neighbours.set(table.id, new Set())
  for (const [a, b] of links) {
    if (a === b) continue
    neighbours.get(a)?.add(b)
    neighbours.get(b)?.add(a)
  }
  const byId = new Map(tables.map((table) => [table.id, table]))
  const seen = new Set<string>()
  const ordered: ErdTable[] = []
  for (const root of tables) {
    if (seen.has(root.id)) continue
    const queue = [root.id]
    seen.add(root.id)
    while (queue.length) {
      const current = queue.shift() as string
      const table = byId.get(current)
      if (table) ordered.push(table)
      for (const next of neighbours.get(current) ?? []) {
        if (seen.has(next)) continue
        seen.add(next)
        queue.push(next)
      }
    }
  }
  return ordered
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
      columnIndexByField.set(field.id, columns.length)
      tableIdByField.set(field.id, id)
      columns.push({
        name: field.name,
        type: typeText(field),
        note: field.note ?? '',
        default: defaultText(field),
        pk,
        fk: false,
        unique: Boolean(field.unique),
        notNull: pk || Boolean(field.not_null),
        increment: Boolean(field.increment)
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
      if (table && columnIndex !== undefined) table.columns[columnIndex].fk = true
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

  const ordered = orderTables(
    tables,
    links.map((link) => [link.parent, link.child] as [string, string])
  )
  const perRow = Math.max(1, Math.ceil(Math.sqrt(ordered.length || 1)))
  let cursorY = CANVAS_MARGIN
  let widest = CANVAS_MARGIN
  for (let start = 0; start < ordered.length; start += perRow) {
    const row = ordered.slice(start, start + perRow)
    let cursorX = CANVAS_MARGIN
    let rowHeight = 0
    for (const table of row) {
      table.x = cursorX
      table.y = cursorY
      cursorX += table.width + TABLE_GAP_X
      widest = Math.max(widest, table.x + table.width)
      rowHeight = Math.max(rowHeight, table.height)
    }
    cursorY += rowHeight + TABLE_GAP_Y
  }

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

  const notes: ErdNote[] = []
  let noteY = CANVAS_MARGIN
  const noteX = widest + CANVAS_MARGIN + TABLE_GAP_X
  for (const raw of Object.values(model.notes).sort((a, b) => a.id - b.id)) {
    const body = String(raw.content ?? '').trim()
    if (!body) continue
    notes.push({
      id: `note-${raw.id}`,
      title: raw.name ?? '',
      body,
      x: noteX,
      y: noteY,
      width: NOTE_WIDTH
    })
    noteY += Math.max(NOTE_MIN_HEIGHT, 48 + body.split('\n').length * NOTE_LINE) + NOTE_GAP
  }

  return {
    database: database?.name ?? '',
    tables: ordered.length ? ordered : tables,
    edges,
    notes
  }
}

export function dbmlToErdJson(source: string): string {
  return JSON.stringify(dbmlToDiagram(source))
}
