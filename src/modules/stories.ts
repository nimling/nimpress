import { readdir, readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import type { ComponentStory } from '../types'
import { readBalanced } from './parse/typeMembers'

function parseObjectLiteral(source: string, key: string): Record<string, unknown> | undefined {
  const at = source.search(new RegExp(`\\b${key}\\s*:`))
  if (at < 0) return undefined
  const brace = source.indexOf('{', at)
  if (brace < 0) return undefined
  const body = readBalanced(source, brace + 1)
  try {
    return new Function(`return {${body}}`)() as Record<string, unknown>
  } catch {
    return undefined
  }
}

function stripObjectLiteral(source: string, key: string): string {
  const at = source.search(new RegExp(`\\b${key}\\s*:`))
  if (at < 0) return source
  const brace = source.indexOf('{', at)
  if (brace < 0) return source
  const body = readBalanced(source, brace + 1)
  return source.slice(0, at) + source.slice(brace + 1 + body.length + 1)
}

export function parseStorySource(raw: string, fileName: string): ComponentStory {
  const commentName = raw.match(/^\s*\/\/\s*story:\s*(.+)$/m)?.[1]?.trim()
  const withoutData = stripObjectLiteral(stripObjectLiteral(raw, 'props'), 'slots')
  const sidebar = parseObjectLiteral(withoutData, 'sidebar') as ComponentStory['sidebar']
  const head = stripObjectLiteral(withoutData, 'sidebar')
  const fieldName = head.match(/\bname\s*:\s*['"]([^'"]+)['"]/)?.[1]
  const description = head.match(/\bdescription\s*:\s*['"]([^'"]+)['"]/)?.[1]
  const props = parseObjectLiteral(raw, 'props')
  const slots = parseObjectLiteral(raw, 'slots') as Record<string, string> | undefined
  return {
    name: commentName ?? fieldName ?? basename(fileName).replace(/\.story\.tsx?$/, '').replace(/_/g, ' '),
    file: fileName,
    description,
    props,
    slots,
    sidebar
  }
}

export async function readComponentStories(dir: string): Promise<ComponentStory[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const out: ComponentStory[] = []
  for (const e of entries) {
    if (!e.isFile() || !e.name.match(/\.story\.tsx?$/)) continue
    let raw: string
    try {
      raw = await readFile(join(dir, e.name), 'utf-8')
    } catch {
      continue
    }
    out.push(parseStorySource(raw, e.name))
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}
