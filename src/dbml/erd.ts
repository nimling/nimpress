import { exporter } from '@dbml/core'

const COLUMN_OPTION = {
  autoIncrement: 1,
  primaryKey: 2,
  unique: 4,
  notNull: 8
}

const COLUMN_KEY = {
  primaryKey: 1,
  foreignKey: 2
}

const RELATIONSHIP_TYPE = {
  zeroOne: 2,
  zeroN: 4
}

const DATABASE = {
  MariaDB: 1,
  MSSQL: 2,
  MySQL: 4,
  Oracle: 8,
  PostgreSQL: 16,
  SQLite: 32
}

const SHOW = {
  tableComment: 1,
  columnComment: 2,
  columnDataType: 4,
  columnDefault: 8,
  columnAutoIncrement: 16,
  columnPrimaryKey: 32,
  columnUnique: 64,
  columnNotNull: 128,
  relationship: 256
}

const CANVAS_MIN = 2000
const CANVAS_MAX = 20000
const TABLE_GAP_X = 120
const TABLE_GAP_Y = 100
const TABLE_CHROME_WIDTH = 46
const TABLE_FLAG_WIDTH = 34
const TABLE_HEADER_HEIGHT = 44
const TABLE_ROW_HEIGHT = 30
const TABLE_PADDING = 24
const CANVAS_MARGIN = 60
const MEMO_WIDTH = 240
const MEMO_MIN_HEIGHT = 120

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

interface ErdMeta {
  updateAt: number
  createAt: number
}

interface ErdTable {
  id: string
  name: string
  comment: string
  columnIds: string[]
  seqColumnIds: string[]
  ui: { x: number; y: number; zIndex: number; widthName: number; widthComment: number; color: string }
  meta: ErdMeta
}

interface ErdColumn {
  id: string
  tableId: string
  name: string
  comment: string
  dataType: string
  default: string
  options: number
  ui: { keys: number; widthName: number; widthComment: number; widthDataType: number; widthDefault: number }
  meta: ErdMeta
}

interface ErdRelationshipPoint {
  tableId: string
  columnIds: string[]
  x: number
  y: number
  direction: number
}

interface ErdRelationship {
  id: string
  identification: boolean
  relationshipType: number
  startRelationshipType: number
  start: ErdRelationshipPoint
  end: ErdRelationshipPoint
  meta: ErdMeta
}

interface ErdIndex {
  id: string
  name: string
  tableId: string
  indexColumnIds: string[]
  seqIndexColumnIds: string[]
  unique: boolean
  meta: ErdMeta
}

interface ErdIndexColumn {
  id: string
  indexId: string
  columnId: string
  orderType: number
  meta: ErdMeta
}

interface ErdMemo {
  id: string
  value: string
  ui: { x: number; y: number; zIndex: number; width: number; height: number; color: string }
  meta: ErdMeta
}

export interface ErdSchema {
  $schema: string
  version: string
  settings: Record<string, unknown>
  doc: { tableIds: string[]; relationshipIds: string[]; indexIds: string[]; memoIds: string[] }
  collections: {
    tableEntities: Record<string, ErdTable>
    tableColumnEntities: Record<string, ErdColumn>
    relationshipEntities: Record<string, ErdRelationship>
    indexEntities: Record<string, ErdIndex>
    indexColumnEntities: Record<string, ErdIndexColumn>
    memoEntities: Record<string, ErdMemo>
  }
}

export class DbmlError extends Error {}

const ZERO_META: ErdMeta = { updateAt: 0, createAt: 0 }

function meta(): ErdMeta {
  return { ...ZERO_META }
}

function makeIdFactory(): (kind: string, key: number | string) => string {
  return (kind, key) => `np-${kind}-${key}`
}

function widthOf(text: string): number {
  return Math.max(60, Math.round(text.length * 8))
}

function defaultText(field: DbmlField): string {
  const raw = field.dbdefault
  if (!raw || raw.value === undefined || raw.value === null) return ''
  return String(raw.value)
}

function databaseCode(databaseType: string | null | undefined): number {
  const key = String(databaseType ?? '').toLowerCase()
  if (key.includes('maria')) return DATABASE.MariaDB
  if (key.includes('mssql') || key.includes('sql server')) return DATABASE.MSSQL
  if (key.includes('mysql')) return DATABASE.MySQL
  if (key.includes('oracle')) return DATABASE.Oracle
  if (key.includes('sqlite')) return DATABASE.SQLite
  return DATABASE.PostgreSQL
}

function parseModel(source: string): DbmlModel {
  try {
    return JSON.parse(exporter.export(source, 'json')) as DbmlModel
  } catch (err) {
    throw new DbmlError(formatDbmlError(err))
  }
}

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

function tableHeight(columnCount: number): number {
  return TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * Math.max(columnCount, 1) + TABLE_PADDING
}

function tableWidth(table: ErdTable, columns: ErdColumn[], show: number): number {
  const widest = (pick: (column: ErdColumn) => number) =>
    columns.reduce((max, column) => Math.max(max, pick(column)), 60)
  let width = TABLE_CHROME_WIDTH + widest((c) => c.ui.widthName)
  if (show & SHOW.columnDataType) width += widest((c) => c.ui.widthDataType)
  if (show & SHOW.columnNotNull) width += TABLE_FLAG_WIDTH
  if (show & SHOW.columnDefault) width += widest((c) => c.ui.widthDefault)
  if (show & SHOW.columnComment) width += widest((c) => c.ui.widthComment)
  const header = TABLE_CHROME_WIDTH + table.ui.widthName + (show & SHOW.tableComment ? table.ui.widthComment : 0)
  return Math.max(width, header)
}

function orderTables(model: DbmlModel, tableIds: number[]): number[] {
  const neighbours = new Map<number, Set<number>>()
  for (const id of tableIds) neighbours.set(id, new Set())
  const tableIdByName = new Map<string, number>()
  for (const id of tableIds) {
    const table = model.tables[String(id)]
    if (table) tableIdByName.set(table.name, id)
  }
  for (const ref of Object.values(model.refs)) {
    const ends = ref.endpointIds.map((id) => model.endpoints[String(id)]).filter(Boolean)
    if (ends.length !== 2) continue
    const a = tableIdByName.get(ends[0].tableName)
    const b = tableIdByName.get(ends[1].tableName)
    if (a === undefined || b === undefined || a === b) continue
    neighbours.get(a)?.add(b)
    neighbours.get(b)?.add(a)
  }
  const seen = new Set<number>()
  const ordered: number[] = []
  for (const root of tableIds) {
    if (seen.has(root)) continue
    const queue = [root]
    seen.add(root)
    while (queue.length) {
      const current = queue.shift() as number
      ordered.push(current)
      for (const next of neighbours.get(current) ?? []) {
        if (seen.has(next)) continue
        seen.add(next)
        queue.push(next)
      }
    }
  }
  return ordered
}

export function dbmlToErdSchema(source: string): ErdSchema {
  const model = parseModel(source)
  const id = makeIdFactory()

  const database = Object.values(model.database)[0]
  const schemas = Object.values(model.schemas).sort((a, b) => a.id - b.id)
  const defaultSchemaName = 'public'

  const tableIds: number[] = []
  const schemaNameByTableId = new Map<number, string>()
  for (const schema of schemas) {
    for (const tableId of schema.tableIds) {
      tableIds.push(tableId)
      schemaNameByTableId.set(tableId, schema.name)
    }
  }

  const tableEntities: Record<string, ErdTable> = {}
  const tableColumnEntities: Record<string, ErdColumn> = {}
  const relationshipEntities: Record<string, ErdRelationship> = {}
  const indexEntities: Record<string, ErdIndex> = {}
  const indexColumnEntities: Record<string, ErdIndexColumn> = {}
  const memoEntities: Record<string, ErdMemo> = {}

  const compositeKeyFieldIds = new Set<number>()
  for (const index of Object.values(model.indexes)) {
    if (!index.pk) continue
    for (const columnId of index.columnIds) {
      const indexColumn = model.indexColumns[String(columnId)]
      if (!indexColumn || indexColumn.type !== 'column') continue
      const table = model.tables[String(index.tableId)]
      if (!table) continue
      const field = table.fieldIds
        .map((fid) => model.fields[String(fid)])
        .find((f) => f && f.name === indexColumn.value)
      if (field) compositeKeyFieldIds.add(field.id)
    }
  }

  for (const tableId of tableIds) {
    const table = model.tables[String(tableId)]
    if (!table) continue
    const schemaName = schemaNameByTableId.get(tableId) ?? defaultSchemaName
    const displayName = schemaName === defaultSchemaName ? table.name : `${schemaName}.${table.name}`
    const columnIds: string[] = []

    for (const fieldId of table.fieldIds) {
      const field = model.fields[String(fieldId)]
      if (!field) continue
      const isPrimaryKey = Boolean(field.pk) || compositeKeyFieldIds.has(field.id)
      let options = 0
      if (field.increment) options |= COLUMN_OPTION.autoIncrement
      if (isPrimaryKey) options |= COLUMN_OPTION.primaryKey | COLUMN_OPTION.notNull
      if (field.unique) options |= COLUMN_OPTION.unique
      if (field.not_null) options |= COLUMN_OPTION.notNull
      const dataType = field.type?.type_name ?? ''
      const comment = field.note ?? ''
      const defaultValue = defaultText(field)
      const columnId = id('column', field.id)
      columnIds.push(columnId)
      tableColumnEntities[columnId] = {
        id: columnId,
        tableId: id('table', tableId),
        name: field.name,
        comment,
        dataType,
        default: defaultValue,
        options,
        ui: {
          keys: isPrimaryKey ? COLUMN_KEY.primaryKey : 0,
          widthName: widthOf(field.name),
          widthComment: widthOf(comment),
          widthDataType: widthOf(dataType),
          widthDefault: widthOf(defaultValue)
        },
        meta: meta()
      }
    }

    const entityId = id('table', tableId)
    const comment = table.note ?? ''
    tableEntities[entityId] = {
      id: entityId,
      name: displayName,
      comment,
      columnIds,
      seqColumnIds: [...columnIds],
      ui: {
        x: 0,
        y: 0,
        zIndex: 2,
        widthName: widthOf(displayName),
        widthComment: widthOf(comment),
        color: table.headerColor ?? ''
      },
      meta: meta()
    }

    for (const rawIndexId of table.indexIds) {
      const index = model.indexes[String(rawIndexId)]
      if (!index || index.pk) continue
      const indexId = id('index', index.id)
      const indexColumnIds: string[] = []
      for (const rawColumnId of index.columnIds) {
        const indexColumn = model.indexColumns[String(rawColumnId)]
        if (!indexColumn || indexColumn.type !== 'column') continue
        const field = table.fieldIds
          .map((fid) => model.fields[String(fid)])
          .find((f) => f && f.name === indexColumn.value)
        if (!field) continue
        const indexColumnId = id('index-column', indexColumn.id)
        indexColumnIds.push(indexColumnId)
        indexColumnEntities[indexColumnId] = {
          id: indexColumnId,
          indexId,
          columnId: id('column', field.id),
          orderType: 1,
          meta: meta()
        }
      }
      if (!indexColumnIds.length) continue
      indexEntities[indexId] = {
        id: indexId,
        name: index.name ?? `${table.name}_index_${index.id}`,
        tableId: entityId,
        indexColumnIds,
        seqIndexColumnIds: [...indexColumnIds],
        unique: Boolean(index.unique),
        meta: meta()
      }
    }
  }

  const tableIdByName = new Map<string, number>()
  for (const tableId of tableIds) {
    const table = model.tables[String(tableId)]
    if (table) tableIdByName.set(table.name, tableId)
  }

  for (const ref of Object.values(model.refs).sort((a, b) => a.id - b.id)) {
    const ends = ref.endpointIds.map((endpointId) => model.endpoints[String(endpointId)]).filter(Boolean)
    if (ends.length !== 2) continue
    const parentIndex = ends[1].relation === '1' ? 1 : ends[0].relation === '1' ? 0 : 1
    const childIndex = parentIndex === 0 ? 1 : 0
    const parent = ends[parentIndex]
    const child = ends[childIndex]
    const parentTableId = tableIdByName.get(parent.tableName)
    const childTableId = tableIdByName.get(child.tableName)
    if (parentTableId === undefined || childTableId === undefined) continue

    const parentColumnIds = parent.fieldIds.map((fieldId) => id('column', fieldId))
    const childColumnIds = child.fieldIds.map((fieldId) => id('column', fieldId))
    if (!parentColumnIds.length || !childColumnIds.length) continue

    let identification = true
    for (const columnId of childColumnIds) {
      const column = tableColumnEntities[columnId]
      if (!column) continue
      column.ui.keys |= COLUMN_KEY.foreignKey
      if ((column.options & COLUMN_OPTION.primaryKey) === 0) identification = false
    }

    const relationshipId = id('relationship', ref.id)
    relationshipEntities[relationshipId] = {
      id: relationshipId,
      identification,
      relationshipType: child.relation === '1' ? RELATIONSHIP_TYPE.zeroOne : RELATIONSHIP_TYPE.zeroN,
      startRelationshipType: 2,
      start: {
        tableId: id('table', parentTableId),
        columnIds: parentColumnIds,
        x: 0,
        y: 0,
        direction: 2
      },
      end: {
        tableId: id('table', childTableId),
        columnIds: childColumnIds,
        x: 0,
        y: 0,
        direction: 1
      },
      meta: meta()
    }
  }

  const columns = Object.values(tableColumnEntities)
  let show = SHOW.columnDataType | SHOW.columnPrimaryKey | SHOW.columnNotNull | SHOW.relationship
  if (Object.values(tableEntities).some((t) => t.comment)) show |= SHOW.tableComment
  if (columns.some((c) => c.comment)) show |= SHOW.columnComment
  if (columns.some((c) => c.default)) show |= SHOW.columnDefault

  const layoutOrder = orderTables(model, tableIds)
  const columnsPerRow = Math.max(1, Math.ceil(Math.sqrt(layoutOrder.length || 1)))
  let cursorY = CANVAS_MARGIN
  let widest = 0
  for (let start = 0; start < layoutOrder.length; start += columnsPerRow) {
    const row = layoutOrder.slice(start, start + columnsPerRow)
    let rowHeight = 0
    let cursorX = CANVAS_MARGIN
    for (const tableId of row) {
      const entity = tableEntities[id('table', tableId)]
      if (!entity) continue
      const width = tableWidth(
        entity,
        entity.columnIds.map((columnId) => tableColumnEntities[columnId]).filter(Boolean),
        show
      )
      entity.ui.x = cursorX
      entity.ui.y = cursorY
      cursorX += width + TABLE_GAP_X
      widest = Math.max(widest, entity.ui.x + width)
      rowHeight = Math.max(rowHeight, tableHeight(entity.columnIds.length))
    }
    cursorY += rowHeight + TABLE_GAP_Y
  }

  const memoX = widest + CANVAS_MARGIN
  let memoY = CANVAS_MARGIN
  for (const note of Object.values(model.notes).sort((a, b) => a.id - b.id)) {
    const content = String(note.content ?? '').trim()
    if (!content) continue
    const value = note.name ? `${note.name}\n\n${content}` : content
    const memoId = id('memo', note.id)
    const height = Math.max(MEMO_MIN_HEIGHT, 40 + value.split('\n').length * 20)
    memoEntities[memoId] = {
      id: memoId,
      value,
      ui: { x: memoX, y: memoY, zIndex: 2, width: MEMO_WIDTH, height, color: '' },
      meta: meta()
    }
    memoY += height + 24
  }

  const contentWidth = Math.max(memoX + MEMO_WIDTH + CANVAS_MARGIN, widest + CANVAS_MARGIN)
  const contentHeight = Math.max(cursorY + CANVAS_MARGIN, memoY + CANVAS_MARGIN)

  return {
    $schema: 'https://raw.githubusercontent.com/dineug/erd-editor/main/json-schema/schema.json',
    version: '3.0.0',
    settings: {
      width: Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.ceil(contentWidth))),
      height: Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.ceil(contentHeight))),
      scrollTop: 0,
      scrollLeft: 0,
      zoomLevel: 1,
      show,
      database: databaseCode(database?.databaseType),
      databaseName: database?.name ?? '',
      canvasType: 'ERD',
      language: 1,
      tableNameCase: 4,
      columnNameCase: 2,
      bracketType: 1,
      relationshipDataTypeSync: true,
      relationshipOptimization: false,
      columnOrder: [1, 2, 4, 8, 16, 32, 64],
      maxWidthComment: -1,
      ignoreSaveSettings: 0
    },
    doc: {
      tableIds: layoutOrder.map((tableId) => id('table', tableId)),
      relationshipIds: Object.keys(relationshipEntities),
      indexIds: Object.keys(indexEntities),
      memoIds: Object.keys(memoEntities)
    },
    collections: {
      tableEntities,
      tableColumnEntities,
      relationshipEntities,
      indexEntities,
      indexColumnEntities,
      memoEntities
    }
  }
}

export function dbmlToErdJson(source: string): string {
  return JSON.stringify(dbmlToErdSchema(source))
}
