import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { ControlSchema, ControlSpec } from '../../types'
import { splitTypeMembers, controlFromType, extractTypeBody } from './typeMembers'

function walkDts(dir: string, out: string[] = []): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      walkDts(full, out)
    } else if (e.isFile() && e.name.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

export function findComponentDts(cwd: string, pkg: string, component: string): string | null {
  const root = join(cwd, 'node_modules', pkg)
  if (!existsSync(root) || !statSync(root).isDirectory()) return null
  const names = [
    `${component}.vue.d.ts`,
    `${component}.svelte.d.ts`,
    `${component}.d.ts`,
    `${component.toLowerCase()}/index.d.ts`
  ]
  const files = walkDts(root)
  for (const name of names) {
    const hit = files.find((f) => f.endsWith(`/${name}`))
    if (hit) return hit
  }
  return null
}

export function parseDtsSchema(text: string, component: string): ControlSchema | undefined {
  const propsBody =
    extractTypeBody(text, `${component}Props`) ?? extractTypeBody(text, 'Props')
  if (!propsBody) return undefined
  const props: ControlSpec[] = []
  const slots: ControlSpec[] = []
  const emits: string[] = []
  for (const member of splitTypeMembers(propsBody)) {
    if (/\bSnippet\b/.test(member.type)) {
      slots.push({ name: member.name, kind: 'slot', type: member.type, required: !member.optional })
      continue
    }
    if (/^on[A-Z]/.test(member.name) && /=>/.test(member.type)) {
      emits.push(member.name)
      continue
    }
    props.push(controlFromType(member.name, member.type, member.optional, text, member.description))
  }
  return { component, props, slots, emits }
}
