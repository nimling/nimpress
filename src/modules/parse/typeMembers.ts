import type { ControlSpec } from '../../types'
import * as mocks from '../../mock'

export interface TypeMember {
  name: string
  type: string
  optional: boolean
  description?: string
  annotations?: Record<string, unknown>
}

function parseJsdocTags(body: string): { description: string; annotations: Record<string, unknown> } {
  const annotations: Record<string, unknown> = {}
  const num = (tag: string, key: string) => {
    const m = body.match(new RegExp(`@${tag}\\s+(-?[0-9.]+)`))
    if (m) annotations[key] = Number(m[1])
  }
  num('minimum', 'minimum')
  num('maximum', 'maximum')
  num('exclusiveMinimum', 'exclusiveMinimum')
  num('exclusiveMaximum', 'exclusiveMaximum')
  num('multipleOf', 'multipleOf')
  num('minLength', 'minLength')
  num('maxLength', 'maxLength')
  num('minItems', 'minItems')
  num('maxItems', 'maxItems')
  const parseVal = (raw: string): unknown => {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  const pat = body.match(/@pattern\s+(.+)/)
  if (pat) annotations.pattern = pat[1].trim()
  const fmt = body.match(/@format\s+(\S+)/)
  if (fmt) annotations.format = fmt[1]
  const def = body.match(/@default\s+(.+)/)
  if (def) annotations.default = parseVal(def[1].trim())
  const examples = [...body.matchAll(/@examples?\s+(.+)/g)].map((m) => parseVal(m[1].trim()))
  if (examples.length) annotations.examples = examples
  if (/@deprecated\b/.test(body)) annotations.deprecated = true
  if (/@readonly\b|@readOnly\b/.test(body)) annotations.readOnly = true
  if (/@uniqueItems\b/.test(body)) annotations.uniqueItems = true
  const description = body.replace(/^\s*@\w+.*$/gm, '').trim()
  return { description, annotations }
}

function splitLeadingComments(text: string): {
  description?: string
  annotations?: Record<string, unknown>
  member: string
} {
  let description: string | undefined
  let annotations: Record<string, unknown> | undefined
  let member = text
  for (;;) {
    const jsdoc = member.match(/^\/\*\*?([\s\S]*?)\*\/\s*/)
    if (jsdoc) {
      const body = jsdoc[1].replace(/^\s*\*\s?/gm, '').trim()
      const parsed = parseJsdocTags(body)
      description = parsed.description || undefined
      if (Object.keys(parsed.annotations).length) annotations = parsed.annotations
      member = member.slice(jsdoc[0].length)
      continue
    }
    const line = member.match(/^\/\/\s*([^\n]*)(?:\n\s*|$)/)
    if (line) {
      description = line[1].trim()
      member = member.slice(line[0].length)
      continue
    }
    return { description, annotations, member }
  }
}

export function splitTypeMembers(body: string): TypeMember[] {
  const members: TypeMember[] = []
  let depth = 0
  let current = ''
  let prev = ''
  const flush = () => {
    const text = current.trim()
    current = ''
    if (!text) return
    const { description, annotations, member } = splitLeadingComments(text)
    const m = member.match(/^(?:readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/)
    if (!m) return
    members.push({ name: m[1], optional: m[2] === '?', type: m[3].trim(), description, annotations })
  }
  let inComment = false
  const chars = [...body]
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (!inComment && ch === '/' && chars[i + 1] === '*') inComment = true
    if (inComment && ch === '/' && chars[i - 1] === '*') inComment = false
    if (!inComment) {
      if (ch === '{' || ch === '(' || ch === '[') depth++
      else if (ch === '}' || ch === ')' || ch === ']') depth--
      else if (ch === '<' && prev !== '=') depth++
      else if (ch === '>' && prev !== '=') depth--
      if ((ch === ';' || ch === ',') && depth === 0) {
        flush()
        prev = ch
        continue
      }
      if (ch === '\n' && depth === 0) {
        if (splitLeadingComments(current.trim()).member === '') {
          current += ch
          prev = ch
          continue
        }
        flush()
        prev = ch
        continue
      }
    }
    current += ch
    prev = ch
  }
  flush()
  return members
}

export function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    if (ch === '{' || ch === '(' || ch === '[') depth++
    else if (ch === '}' || ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

export function stringLiteralUnion(type: string): string[] | null {
  const parts = type
    .split('|')
    .map((p) => p.trim())
    .filter((p) => p !== '' && p !== 'undefined' && p !== 'null')
  if (!parts.length) return null
  const out: string[] = []
  for (const p of parts) {
    const m = p.match(/^['"]([^'"]*)['"]$/)
    if (!m) return null
    out.push(m[1])
  }
  return out
}

export function resolveTypeAlias(type: string, typeContext: string): string {
  const t = type.trim()
  if (!/^[A-Za-z_$][\w$]*$/.test(t)) return type
  const re = new RegExp(`(?:export\\s+)?type\\s+${t}\\s*=\\s*([^\\n;]*(?:\\n\\s*\\|[^\\n;]+)*)`)
  const m = typeContext.match(re)
  const body = m?.[1]?.replace(/\s+/g, ' ').trim()
  return body ? body : type
}

function shapeOfMembers(members: ControlSpec[]): string {
  const compact = members
    .map((m) => `${m.name}${m.required ? '' : '?'}: ${m.shape ?? m.type}`)
    .join('; ')
  return `{ ${compact} }`
}

export interface ControlJsonSchema {
  type?: string
  title?: string
  description?: string
  enum?: unknown[]
  properties?: Record<string, ControlJsonSchema>
  required?: string[]
  items?: ControlJsonSchema
  default?: unknown
  format?: string
  mock?: string
}

export function formatFor(spec: ControlSpec): string | undefined {
  if (spec.format) return spec.format
  if (spec.kind !== 'text' && spec.kind !== 'slot') return undefined
  const n = `${spec.name} ${spec.description ?? ''}`.toLowerCase()
  if (/email/.test(n)) return 'email'
  if (/url|href|link|website/.test(n)) return 'uri'
  if (/date-time|datetime|timestamp/.test(n)) return 'date-time'
  if (/date/.test(n)) return 'date'
  if (/uuid/.test(n)) return 'uuid'
  return undefined
}

export function mockNameFor(name: string, js: Record<string, unknown>): string {
  const n = name.toLowerCase()
  const type = js.type
  const format = typeof js.format === 'string' ? js.format : undefined
  if (js.enum) return 'mockOption'
  if (type === 'boolean') return 'mockBoolean'
  if (type === 'number' || type === 'integer') {
    if (/index|offset|position/.test(n)) return 'mockIndex'
    if (/count|total|amount|quantity/.test(n)) return 'mockCount'
    if (/percent|progress|opacity/.test(n)) return 'mockPercent'
    if (/width/.test(n)) return 'mockWidth'
    if (/height/.test(n)) return 'mockHeight'
    if (/price|cost/.test(n)) return 'mockPrice'
    if (/year/.test(n)) return 'mockYear'
    if (/age/.test(n)) return 'mockAge'
    return type === 'integer' ? 'mockInt' : 'mockFloat'
  }
  if (type === 'string') {
    if (format === 'email' || /email/.test(n)) return 'mockEmail'
    if (/password/.test(n)) return 'mockPassword'
    if (/image|avatar|photo|thumbnail|poster|banner|logo/.test(n)) return 'mockImageUrl'
    if (format === 'uri' || /url|href|link/.test(n)) return 'mockUrl'
    if (format === 'date' || format === 'date-time' || /date/.test(n)) return 'mockDate'
    if (format === 'uuid' || /uuid|slug/.test(n)) return 'mockId'
    if (/color|colour/.test(n)) return 'mockColor'
    if (/icon/.test(n)) return 'mockIcon'
    if (/username|handle|login/.test(n)) return 'mockUsername'
    if (/firstname|first_name/.test(n)) return 'mockFirstName'
    if (/lastname|last_name|surname|familyname|family_name/.test(n)) return 'mockFamilyName'
    if (/name/.test(n)) return 'mockFullName'
    if (/title|label|heading|headline/.test(n)) return 'mockTitle'
    if (/description|content|detail|body|paragraph|message|caption|subtitle|placeholder|text|summary/.test(n)) return 'mockSentence'
    return 'mockWord'
  }
  return 'mockWord'
}

export function controlToJsonSchema(spec: ControlSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (spec.description) out.description = spec.description
  if (spec.default !== undefined) out.default = spec.default
  if (spec.kind === 'select') out.enum = spec.options ?? []
  else if (spec.kind === 'boolean') out.type = 'boolean'
  else if (spec.kind === 'number') out.type = 'number'
  else if (spec.kind === 'text' || spec.kind === 'slot') {
    out.type = 'string'
    const fmt = formatFor(spec)
    if (fmt) out.format = fmt
  } else if (spec.kind === 'array') {
    out.type = 'array'
    out.items = spec.item ? controlToJsonSchema(spec.item) : {}
  } else if (spec.kind === 'record') {
    out.type = 'object'
    out.additionalProperties = spec.item ? controlToJsonSchema(spec.item) : {}
  } else if (spec.kind === 'object') {
    out.type = 'object'
    out.properties = Object.fromEntries((spec.members ?? []).map((m) => [m.name, controlToJsonSchema(m)]))
    const required = (spec.members ?? []).filter((m) => m.required).map((m) => m.name)
    if (required.length) out.required = required
  } else {
    out.tsType = spec.type
  }
  for (const [k, v] of Object.entries(spec.annotations ?? {})) {
    if (!(k in out)) out[k] = v
  }
  return out
}

export function applyAnnotations(spec: ControlSpec, member: TypeMember): ControlSpec {
  if (member.annotations) {
    spec.annotations = member.annotations
    if (typeof member.annotations.format === 'string') spec.format = member.annotations.format
    if (member.annotations.default !== undefined && spec.default === undefined) {
      spec.default = member.annotations.default
    }
  }
  return spec
}

function withMock(name: string, spec: ControlSpec): Record<string, unknown> {
  const js = controlToJsonSchema(spec)
  const mock =
    spec.mock ??
    (spec.kind === 'function' || spec.kind === 'event' ? 'mockEvent' : mockNameFor(name, js))
  return { ...js, mock }
}

export function schemaToJsonSchema(
  component: string,
  props: ControlSpec[],
  slots: ControlSpec[] = [],
  emits: string[] = []
): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: component,
    type: 'object',
    properties: Object.fromEntries(props.map((p) => [p.name, withMock(p.name, p)])),
    required: props.filter((p) => p.required).map((p) => p.name),
    slots: Object.fromEntries(slots.map((s) => [s.name, withMock(s.name, s)])),
    emits
  }
}

export interface ComponentJsonSchema {
  properties?: Record<string, ControlJsonSchema>
  required?: string[]
  slots?: Record<string, ControlJsonSchema>
  emits?: string[]
}

export function mockValue(spec: ControlSpec, seed = 0): unknown {
  if (spec.kind === 'function' || spec.kind === 'event') return { __nimpressFn: mocks.fnSource(spec.name) }
  if (spec.kind === 'object') {
    const out: Record<string, unknown> = {}
    for (const member of spec.members ?? []) {
      const v = mockValue(member, seed)
      if (v !== undefined) out[member.name] = v
    }
    return Object.keys(out).length ? out : undefined
  }
  if (spec.kind === 'array') {
    if (!spec.item) return undefined
    const first = mockValue(spec.item, seed)
    if (first === undefined) return undefined
    return [first, mockValue(spec.item, seed + 1)]
  }
  if (spec.kind === 'record') {
    const out: Record<string, unknown> = {}
    for (let i = 0; i < 2; i++) {
      const key = mocks.mockWord(seed + i)
      out[key] = spec.item ? (mockValue(spec.item, seed + i) ?? mocks.mockSentence(seed + i)) : mocks.mockSentence(seed + i)
    }
    return out
  }
  const name =
    spec.mock ??
    (spec.kind === 'boolean'
      ? 'mockBoolean'
      : spec.kind === 'number'
        ? 'mockInt'
        : spec.kind === 'select'
          ? 'mockOption'
          : 'mockWord')
  const fn = (mocks as unknown as Record<string, (...a: unknown[]) => unknown>)[name]
  if (typeof fn !== 'function') return undefined
  if (name === 'mockOption') return fn(spec.options ?? [], seed)
  return fn(seed)
}

export function schemaFromJsonSchema(
  component: string,
  raw: ComponentJsonSchema
): { component: string; props: ControlSpec[]; slots: ControlSpec[]; emits: string[] } {
  const required = new Set(raw.required ?? [])
  const props = Object.entries(raw.properties ?? {}).map(([name, member]) =>
    controlFromJsonSchema(name, member, required.has(name))
  )
  const slots = Object.entries(raw.slots ?? {}).map(([name, member]) => ({
    ...controlFromJsonSchema(name, member),
    kind: 'slot' as const
  }))
  const emits = Array.isArray(raw.emits) ? raw.emits : []
  return { component, props, slots, emits }
}

export function opaqueControls(props: ControlSpec[], prefix = ''): Array<{ path: string; type: string }> {
  const out: Array<{ path: string; type: string }> = []
  for (const spec of props) {
    const path = prefix ? `${prefix}.${spec.name || '[]'}` : spec.name || '[]'
    if (spec.kind === 'json' && /^[A-Za-z_$][\w$]*(\[\])?$/.test(spec.type) && spec.type !== 'unknown') {
      out.push({ path, type: spec.type })
    }
    if (spec.members) out.push(...opaqueControls(spec.members, path))
    if (spec.item) out.push(...opaqueControls([spec.item], path))
  }
  return out
}

export function controlFromJsonSchema(
  name: string,
  schema: ControlJsonSchema,
  required = false,
  depth = 0
): ControlSpec {
  const description = schema.description
  const extra = { format: schema.format, mock: schema.mock }
  if (schema.enum) {
    const options = schema.enum.map(String)
    return {
      name,
      kind: 'select',
      type: schema.enum.map((v) => JSON.stringify(v)).join(' | '),
      options,
      required,
      description,
      default: schema.default,
      ...extra
    }
  }
  if (schema.type === 'boolean') {
    return { name, kind: 'boolean', type: 'boolean', required, description, default: schema.default, ...extra }
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return { name, kind: 'number', type: 'number', required, description, default: schema.default, ...extra }
  }
  if (schema.type === 'string') {
    return { name, kind: 'text', type: 'string', required, description, default: schema.default, ...extra }
  }
  if (schema.type === 'array' && schema.items && depth < 6) {
    const item = controlFromJsonSchema('', schema.items, false, depth + 1)
    return {
      name,
      kind: 'array',
      type: schema.title ?? `${item.type}[]`,
      item,
      required,
      description,
      default: schema.default,
      shape: `${item.shape ?? item.type}[]`,
      ...extra
    }
  }
  if (schema.type === 'object' && schema.properties && depth < 6) {
    const requiredNames = schema.required ?? []
    const members = Object.entries(schema.properties).map(([key, member]) =>
      controlFromJsonSchema(key, member, requiredNames.includes(key), depth + 1)
    )
    return {
      name,
      kind: 'object',
      type: schema.title ?? 'object',
      members,
      required,
      description,
      default: schema.default,
      shape: shapeOfMembers(members),
      ...extra
    }
  }
  return { name, kind: 'json', type: schema.type ?? 'unknown', required, description, default: schema.default, ...extra }
}

export function controlFromType(
  name: string,
  type: string,
  optional: boolean,
  typeContext = '',
  description?: string,
  depth = 0,
  seen: string[] = []
): ControlSpec {
  const resolved = resolveTypeAlias(type, typeContext)
  const t = resolved.replace(/\s+/g, ' ').trim()
  const options = stringLiteralUnion(t)
  if (options) return { name, kind: 'select', type: t, options, required: !optional, description }
  const bare = t.replace(/\s*\|\s*(undefined|null)\s*/g, '').trim()
  if (bare === 'boolean') return { name, kind: 'boolean', type: t, required: !optional, description }
  if (bare === 'number') return { name, kind: 'number', type: t, required: !optional, description }
  if (bare === 'string') return { name, kind: 'text', type: t, required: !optional, description }
  if (/^\([^)]*\)\s*=>/.test(bare)) {
    return { name, kind: 'function', type: t, required: !optional, description }
  }
  if (depth < 4) {
    const valueType =
      bare.match(/^Record<\s*string\s*,\s*(.+)>$/)?.[1] ??
      bare.match(/^\{\s*\[\s*\w+\s*:\s*string\s*\]\s*:\s*(.+?);?\s*\}$/)?.[1]
    if (valueType) {
      const item = controlFromType('', valueType, false, typeContext, undefined, depth + 1, seen)
      return {
        name,
        kind: 'record',
        type: t,
        item,
        required: !optional,
        description,
        shape: `Record<string, ${item.shape ?? item.type}>`
      }
    }
    const itemType = bare.match(/^(.*\S)\[\]$/)?.[1] ?? bare.match(/^Array<(.+)>$/)?.[1]
    if (itemType) {
      const item = controlFromType('', itemType, false, typeContext, undefined, depth + 1, seen)
      if (item.kind !== 'json') {
        return {
          name,
          kind: 'array',
          type: t,
          item,
          required: !optional,
          description,
          shape: `${item.shape ?? item.type}[]`
        }
      }
    }
    let body: string | null = null
    let alias = ''
    if (bare.startsWith('{') && bare.endsWith('}')) {
      body = bare.slice(1, -1)
    } else if (/^[A-Za-z_$][\w$]*$/.test(bare) && !seen.includes(bare)) {
      alias = bare
      body = extractTypeBody(typeContext, bare)
    }
    if (body !== null) {
      const nextSeen = alias ? [...seen, alias] : seen
      const members = splitTypeMembers(body).map((m) =>
        controlFromType(m.name, m.type, m.optional, typeContext, m.description, depth + 1, nextSeen)
      )
      if (members.length) {
        return {
          name,
          kind: 'object',
          type: t,
          members,
          required: !optional,
          description,
          shape: shapeOfMembers(members)
        }
      }
    }
  }
  return { name, kind: 'json', type: t, required: !optional, description }
}

export function parseLiteral(text: string): unknown {
  const t = text.trim()
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  const q = t.match(/^['"]([\s\S]*)['"]$/)
  if (q) return q[1]
  try {
    return JSON.parse(t)
  } catch {
    return undefined
  }
}

export function readBalanced(text: string, start: number, open = '{', close = '}'): string {
  let depth = 1
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return text.slice(start, i)
    }
  }
  return text.slice(start)
}

export function extractTypeBody(script: string, name: string): string | null {
  const patterns = [
    new RegExp(`interface\\s+${name}\\s*(?:extends[^{]+)?\\{`),
    new RegExp(`type\\s+${name}\\s*=\\s*\\{`)
  ]
  for (const re of patterns) {
    const m = re.exec(script)
    if (!m) continue
    return readBalanced(script, m.index + m[0].length)
  }
  return null
}
