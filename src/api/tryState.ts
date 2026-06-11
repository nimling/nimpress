import type { FlatOperation, SecurityScheme } from './types'
import { resolveRef, type SchemaRegistry } from './refs'

export interface TryState {
  selectedScheme: string
  authValue: string
  serverUrl: string
  pathValues: Record<string, string>
  queryValues: Record<string, string>
  headerValues: Record<string, string>
  bodyValue: string
}

type JsonSchema = {
  type?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  enum?: unknown[]
  example?: unknown
  default?: unknown
  format?: string
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
  allOf?: JsonSchema[]
}

function pickJsonContent(op: FlatOperation): { schema?: JsonSchema; example?: unknown } | null {
  const body = op.requestBody as { content?: Record<string, { schema?: JsonSchema; example?: unknown; examples?: Record<string, { value?: unknown }> }> } | undefined
  const content = body?.content
  if (!content) return null
  const json = content['application/json'] ?? content[Object.keys(content)[0] ?? '']
  if (!json) return null
  let example: unknown = json.example
  if (example === undefined && json.examples) {
    const picked = json.examples.default ?? Object.values(json.examples)[0]
    if (picked && typeof picked === 'object' && 'value' in picked) example = picked.value
    else example = picked
  }
  return { schema: json.schema, example }
}

function synthesizeFromSchema(
  schema: JsonSchema | undefined,
  registry: SchemaRegistry | null | undefined,
  seen: Set<JsonSchema> = new Set()
): unknown {
  const resolved = resolveRef(schema, registry) as JsonSchema | undefined
  if (!resolved || typeof resolved !== 'object') return null
  if (seen.has(resolved)) return null
  seen.add(resolved)
  if (resolved.example !== undefined) return resolved.example
  if (resolved.default !== undefined) return resolved.default
  if (Array.isArray(resolved.enum) && resolved.enum.length > 0) return resolved.enum[0]
  const composed = resolved.oneOf?.[0] ?? resolved.anyOf?.[0] ?? (resolved.allOf?.length ? Object.assign({}, ...resolved.allOf) as JsonSchema : undefined)
  if (composed) return synthesizeFromSchema(composed, registry, seen)
  const t = resolved.type
  if (t === 'object' || resolved.properties) {
    const out: Record<string, unknown> = {}
    const required = new Set(resolved.required ?? [])
    const props = resolved.properties ?? {}
    for (const [name, propSchema] of Object.entries(props)) {
      if (!required.has(name)) continue
      out[name] = synthesizeFromSchema(propSchema, registry, seen)
    }
    return out
  }
  if (t === 'array') return [synthesizeFromSchema(resolved.items, registry, seen)]
  if (t === 'string') {
    if (resolved.format === 'date-time') return '2026-01-01T00:00:00Z'
    if (resolved.format === 'date') return '2026-01-01'
    if (resolved.format === 'uuid') return '00000000-0000-0000-0000-000000000000'
    if (resolved.format === 'email') return 'user@example.com'
    return ''
  }
  if (t === 'integer' || t === 'number') return 0
  if (t === 'boolean') return false
  return null
}

function buildBodyExample(op: FlatOperation, registry: SchemaRegistry | null | undefined): unknown {
  if (op.requestExample !== undefined) return op.requestExample
  const json = pickJsonContent(op)
  if (!json) return undefined
  if (json.example !== undefined) return json.example
  return synthesizeFromSchema(json.schema, registry)
}

export function createTryState(
  op: FlatOperation,
  initialServer: string,
  schemes: Record<string, SecurityScheme>,
  registry: SchemaRegistry | null | undefined = null
): TryState {
  void schemes
  const example = buildBodyExample(op, registry)
  return {
    selectedScheme: '',
    authValue: '',
    serverUrl: initialServer,
    pathValues: {},
    queryValues: {},
    headerValues: {},
    bodyValue: example !== undefined ? JSON.stringify(example, null, 2) : ''
  }
}

export function fillPath(op: FlatOperation, state: TryState): string {
  let p = op.path
  for (const param of op.parameters.filter((x) => x.in === 'path')) {
    const v = state.pathValues[param.name] ?? ''
    p = p.replace(`{${param.name}}`, encodeURIComponent(v))
  }
  return p
}

export function buildUrl(op: FlatOperation, state: TryState): string {
  const base = (state.serverUrl || '').replace(/\/$/, '')
  const path = fillPath(op, state)
  const usp = new URLSearchParams()
  for (const param of op.parameters.filter((x) => x.in === 'query')) {
    const v = state.queryValues[param.name]
    if (v !== undefined && v !== '') usp.set(param.name, v)
  }
  const q = usp.toString()
  return `${base}${path}${q ? '?' + q : ''}`
}

export function buildAuthHeader(state: TryState, schemes: Record<string, SecurityScheme>): { key: string; value: string } | null {
  if (!state.selectedScheme || !state.authValue) return null
  const scheme = schemes[state.selectedScheme]
  if (!scheme) return null
  if (scheme.type === 'http' && scheme.scheme === 'bearer') {
    return { key: 'Authorization', value: `Bearer ${state.authValue}` }
  }
  if (scheme.type === 'http' && scheme.scheme === 'basic') {
    return { key: 'Authorization', value: `Basic ${state.authValue}` }
  }
  if (scheme.type === 'apiKey' && scheme.in === 'header' && scheme.name) {
    return { key: scheme.name, value: state.authValue }
  }
  return { key: 'Authorization', value: state.authValue }
}

export function buildHeaders(op: FlatOperation, state: TryState, schemes: Record<string, SecurityScheme>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const param of op.parameters.filter((x) => x.in === 'header')) {
    const v = state.headerValues[param.name]
    if (v) out[param.name] = v
  }
  for (const [k, v] of Object.entries(state.headerValues)) {
    if (v && out[k] === undefined) out[k] = v
  }
  const auth = buildAuthHeader(state, schemes)
  if (auth) out[auth.key] = auth.value
  if (state.bodyValue && ['POST', 'PUT', 'PATCH'].includes(op.method)) {
    out['Content-Type'] = out['Content-Type'] ?? 'application/json'
  }
  return out
}

export function hasBody(op: FlatOperation, state: TryState): boolean {
  return !!state.bodyValue && ['POST', 'PUT', 'PATCH'].includes(op.method)
}
