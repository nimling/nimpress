export const SCHEMAS_CONTEXT = 'np-openapi-schemas'

const PREFIX = '#/components/schemas/'

export type SchemaRegistry = Record<string, unknown>

export function resolveRef(value: unknown, registry: SchemaRegistry | null | undefined): unknown {
  if (!value || typeof value !== 'object') return value
  const obj = value as Record<string, unknown>
  if (typeof obj.$ref !== 'string') return value
  if (!registry) return value
  const seen = new Set<string>()
  let current: unknown = value
  while (current && typeof current === 'object') {
    const ref = (current as Record<string, unknown>).$ref
    if (typeof ref !== 'string') return current
    if (!ref.startsWith(PREFIX)) return current
    if (seen.has(ref)) return current
    seen.add(ref)
    const key = ref.slice(PREFIX.length)
    const target = registry[key]
    if (target == null) return current
    current = target
  }
  return current
}

export interface SchemaMeta {
  typeLabel: string
  format?: string
  enumValues?: unknown[]
  expandable: boolean
}

function refName(ref: string): string {
  const tail = ref.slice(ref.lastIndexOf('/') + 1)
  return tail.replace(/\.json$/i, '')
}

function typeLabel(value: unknown, registry: SchemaRegistry | null | undefined): string {
  if (!value || typeof value !== 'object') return 'any'
  const obj = value as Record<string, any>
  if (typeof obj.$ref === 'string') {
    const resolved = resolveRef(obj, registry)
    if (resolved !== obj) return typeLabel(resolved, registry)
    return refName(obj.$ref)
  }
  if (obj.type === 'array') return typeLabel(resolveRef(obj.items, registry), registry) + '[]'
  if (Array.isArray(obj.oneOf) || Array.isArray(obj.anyOf)) return 'object'
  return typeof obj.type === 'string' ? obj.type : 'any'
}

export function leafSchema(value: unknown, registry: SchemaRegistry | null | undefined): any {
  let current = resolveRef(value, registry)
  while (current && typeof current === 'object' && (current as any).type === 'array') {
    current = resolveRef((current as any).items, registry)
  }
  return current
}

export function describeSchema(value: unknown, registry: SchemaRegistry | null | undefined): SchemaMeta {
  const leaf = leafSchema(value, registry)
  const enumValues = Array.isArray(leaf?.enum) ? leaf.enum : undefined
  return {
    typeLabel: typeLabel(value, registry),
    format: typeof leaf?.format === 'string' ? leaf.format : undefined,
    enumValues,
    expandable: !!(leaf && typeof leaf === 'object' && leaf.properties),
  }
}
