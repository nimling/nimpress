import { readdir, readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import type { ComponentStory } from '../types'

function evaluateStoryModule(code: string): unknown {
  const body = code
    .split('\n')
    .filter((line) => !/^\s*import\b/.test(line))
    .join('\n')
    .replace(/\bsatisfies\s+[A-Za-z_$][\w$.]*(?:<[^>]*>)?/g, '')
    .replace(/\bas\s+const\b/g, '')
    .replace(/export\s+default\b/, 'return')
  return new Function(body)()
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
    if (!e.isFile() || !e.name.endsWith('.story.ts')) continue
    const file = join(dir, e.name)
    let raw: string
    try {
      raw = await readFile(file, 'utf-8')
    } catch {
      continue
    }
    let data: unknown
    try {
      data = evaluateStoryModule(raw)
    } catch (err) {
      console.warn(`[nimpress] failed to evaluate story ${file}:`, err)
      continue
    }
    if (typeof data !== 'object' || data === null) {
      console.warn(`[nimpress] story ${file} has no default export object`)
      continue
    }
    const story = data as Partial<ComponentStory>
    out.push({
      name: story.name ?? basename(e.name, '.story.ts'),
      file: e.name,
      description: story.description,
      props: story.props,
      slots: story.slots
    })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}
