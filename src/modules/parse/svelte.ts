import type { ControlSchema, ControlSpec } from '../../types'
import {
  splitTypeMembers,
  splitTopLevel,
  controlFromType,
  parseLiteral,
  readBalanced,
  extractTypeBody
} from './typeMembers'

export function parseSvelteComponent(source: string, component: string, extraTypes = ''): ControlSchema {
  const script = source.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const typeContext = `${script}\n${extraTypes}`

  const propsCall = script.match(/(?:let|const)\s*\{([\s\S]*?)\}\s*(?::\s*([\s\S]*?))?=\s*\$props\(\)/)

  const defaults = new Map<string, unknown>()
  if (propsCall) {
    for (const part of splitTopLevel(propsCall[1])) {
      const m = part.match(/^([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/)
      if (!m) continue
      const bindable = m[2].trim().match(/^\$bindable\(([\s\S]*)\)$/)
      defaults.set(m[1], parseLiteral(bindable ? bindable[1] : m[2]))
    }
  }

  let propsBody: string | null = null
  const annotation = propsCall?.[2]?.trim()
  if (annotation) {
    if (annotation.startsWith('{')) {
      propsBody = readBalanced(annotation, 1)
    } else {
      const named = annotation.match(/^([A-Za-z_$][\w$]*)/)
      if (named) propsBody = extractTypeBody(typeContext, named[1])
    }
  }

  const props: ControlSpec[] = []
  const slots: ControlSpec[] = []
  const emits: string[] = []

  if (propsBody) {
    for (const member of splitTypeMembers(propsBody)) {
      if (/\bSnippet\b/.test(member.type)) {
        slots.push({ name: member.name, kind: 'slot', type: member.type, required: !member.optional })
        continue
      }
      if (/^on[A-Z]/.test(member.name) && /=>/.test(member.type)) {
        emits.push(member.name)
        continue
      }
      const spec = controlFromType(member.name, member.type, member.optional, typeContext)
      if (defaults.has(member.name)) spec.default = defaults.get(member.name)
      props.push(spec)
    }
  } else if (propsCall) {
    for (const part of splitTopLevel(propsCall[1])) {
      const name = part.match(/^([A-Za-z_$][\w$]*)/)?.[1]
      if (!name || name === 'children') continue
      const spec: ControlSpec = { name, kind: 'json', type: 'unknown' }
      if (defaults.has(name)) spec.default = defaults.get(name)
      props.push(spec)
    }
    if (/\bchildren\b/.test(propsCall[1])) {
      slots.push({ name: 'children', kind: 'slot', type: 'Snippet' })
    }
  }

  return { component, props, slots, emits }
}
