import type { ControlSchema, ControlSpec } from '../../types'
import {
  splitTypeMembers,
  splitTopLevel,
  controlFromType,
  applyAnnotations,
  parseLiteral,
  readBalanced,
  extractTypeBody
} from './typeMembers'

export function parseVueComponent(source: string, component: string, extraTypes = ''): ControlSchema {
  const script = source.match(/<script[^>]*\bsetup\b[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const template = source.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? ''
  const typeContext = `${script}\n${extraTypes}`

  let propsBody: string | null = null
  const inline = /defineProps<\s*\{/.exec(script)
  if (inline) {
    propsBody = readBalanced(script, inline.index + inline[0].length)
  } else {
    const named = script.match(/defineProps<\s*([A-Za-z_$][\w$]*)\s*>/)
    if (named) propsBody = extractTypeBody(typeContext, named[1])
  }

  const defaults = new Map<string, unknown>()
  const destructure = script.match(/(?:const|let)\s*\{([\s\S]*?)\}\s*=\s*(?:withDefaults\s*\(\s*)?defineProps/)
  if (destructure) {
    for (const part of splitTopLevel(destructure[1])) {
      const m = part.match(/^([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/)
      if (m) defaults.set(m[1], parseLiteral(m[2]))
    }
  }

  const props: ControlSpec[] = []
  if (propsBody) {
    for (const member of splitTypeMembers(propsBody)) {
      const spec = applyAnnotations(
        controlFromType(member.name, member.type, member.optional, typeContext, member.description),
        member
      )
      if (defaults.has(member.name)) spec.default = defaults.get(member.name)
      props.push(spec)
    }
  }

  for (const model of script.matchAll(/\bdefineModel(?:<([^>]*)>)?\(\s*(?:['"]([\w-]+)['"])?/g)) {
    const name = model[2] ?? 'modelValue'
    if (props.some((p) => p.name === name)) continue
    props.push(controlFromType(name, model[1]?.trim() || 'string', true, typeContext))
  }

  const slots: ControlSpec[] = []
  const seen = new Set<string>()
  for (const m of template.matchAll(/<slot\b([^>]*)>/g)) {
    const name = m[1].match(/name=["']([^"']+)["']/)?.[1] ?? 'default'
    if (seen.has(name)) continue
    seen.add(name)
    slots.push({ name, kind: 'slot', type: 'slot' })
  }

  const emits: string[] = []
  const emitsAt = script.indexOf('defineEmits')
  if (emitsAt >= 0) {
    const rest = script.slice(emitsAt)
    const openIdx = rest.search(/[<(]/)
    if (openIdx >= 0) {
      const open = rest[openIdx]
      const close = open === '<' ? '>' : ')'
      const region = readBalanced(rest, openIdx + 1, open, close)
      const found = new Set<string>()
      for (const q of region.matchAll(/['"]([\w:.-]+)['"]/g)) found.add(q[1])
      for (const k of region.matchAll(/(?:^|[\n;{,])\s*([A-Za-z_$][\w$]*)\s*:\s*\[/g)) found.add(k[1])
      emits.push(...found)
    }
  }

  return { component, props, slots, emits }
}
