import type { ControlSpec } from '../../types'

export interface TypeMember {
  name: string
  type: string
  optional: boolean
  description?: string
}

function splitLeadingComments(text: string): { description?: string; member: string } {
  let description: string | undefined
  let member = text
  for (;;) {
    const jsdoc = member.match(/^\/\*\*?([\s\S]*?)\*\/\s*/)
    if (jsdoc) {
      description = jsdoc[1].replace(/^\s*\*\s?/gm, '').trim()
      member = member.slice(jsdoc[0].length)
      continue
    }
    const line = member.match(/^\/\/\s*([^\n]*)(?:\n\s*|$)/)
    if (line) {
      description = line[1].trim()
      member = member.slice(line[0].length)
      continue
    }
    return { description, member }
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
    const { description, member } = splitLeadingComments(text)
    const m = member.match(/^(?:readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/)
    if (!m) return
    members.push({ name: m[1], optional: m[2] === '?', type: m[3].trim(), description })
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
}

export function controlToJsonSchema(spec: ControlSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (spec.description) out.description = spec.description
  if (spec.default !== undefined) out.default = spec.default
  if (spec.kind === 'select') out.enum = spec.options ?? []
  else if (spec.kind === 'boolean') out.type = 'boolean'
  else if (spec.kind === 'number') out.type = 'number'
  else if (spec.kind === 'text' || spec.kind === 'slot') out.type = 'string'
  else if (spec.kind === 'array') {
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
  return out
}

export function schemaToJsonSchema(component: string, props: ControlSpec[]): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: component,
    type: 'object',
    properties: Object.fromEntries(props.map((p) => [p.name, controlToJsonSchema(p)])),
    required: props.filter((p) => p.required).map((p) => p.name)
  }
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
  if (schema.enum) {
    const options = schema.enum.map(String)
    return {
      name,
      kind: 'select',
      type: schema.enum.map((v) => JSON.stringify(v)).join(' | '),
      options,
      required,
      description,
      default: schema.default
    }
  }
  if (schema.type === 'boolean') {
    return { name, kind: 'boolean', type: 'boolean', required, description, default: schema.default }
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return { name, kind: 'number', type: 'number', required, description, default: schema.default }
  }
  if (schema.type === 'string') {
    return { name, kind: 'text', type: 'string', required, description, default: schema.default }
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
      shape: `${item.shape ?? item.type}[]`
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
      shape: shapeOfMembers(members)
    }
  }
  return { name, kind: 'json', type: schema.type ?? 'unknown', required, description, default: schema.default }
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
