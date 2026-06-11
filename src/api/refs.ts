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
