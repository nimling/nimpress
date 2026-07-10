import type { ControlSpec } from '../../types'

export interface TypeMember {
  name: string
  type: string
  optional: boolean
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
    const m = text.match(/^(?:readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/)
    if (!m) return
    members.push({ name: m[1], optional: m[2] === '?', type: m[3].trim() })
  }
  for (const ch of body) {
    if (ch === '{' || ch === '(' || ch === '[') depth++
    else if (ch === '}' || ch === ')' || ch === ']') depth--
    else if (ch === '<' && prev !== '=') depth++
    else if (ch === '>' && prev !== '=') depth--
    if ((ch === ';' || ch === '\n' || ch === ',') && depth === 0) {
      flush()
      prev = ch
      continue
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

export function controlFromType(name: string, type: string, optional: boolean, typeContext = ''): ControlSpec {
  const resolved = resolveTypeAlias(type, typeContext)
  const t = resolved.replace(/\s+/g, ' ').trim()
  const options = stringLiteralUnion(t)
  if (options) return { name, kind: 'select', type: t, options, required: !optional }
  const bare = t.replace(/\s*\|\s*(undefined|null)\s*/g, '').trim()
  if (bare === 'boolean') return { name, kind: 'boolean', type: t, required: !optional }
  if (bare === 'number') return { name, kind: 'number', type: t, required: !optional }
  if (bare === 'string') return { name, kind: 'text', type: t, required: !optional }
  return { name, kind: 'json', type: t, required: !optional }
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
