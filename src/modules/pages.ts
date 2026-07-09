import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import matter from 'gray-matter'

export interface ComponentPageRef {
  pageFile: string
  system: string
  component: string
  file?: string
  package?: string
  version?: string
}

async function walkMd(dir: string, out: string[] = []): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue
      await walkMd(full, out)
    } else if (e.isFile() && e.name.endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

export async function collectComponentPages(cwd: string, contentDir: string): Promise<ComponentPageRef[]> {
  const root = resolve(cwd, contentDir)
  const files = await walkMd(root)
  const out: ComponentPageRef[] = []
  for (const file of files) {
    let raw: string
    try {
      raw = await readFile(file, 'utf-8')
    } catch {
      continue
    }
    const { data } = matter(raw)
    if (data?.type !== 'component') continue
    const d = (data.data ?? {}) as Record<string, unknown>
    const system = String(d.system ?? '')
    const component = String(d.component ?? '')
    if (!system || !component) continue
    out.push({
      pageFile: file,
      system,
      component,
      file: typeof d.file === 'string' ? d.file : undefined,
      package: typeof d.package === 'string' ? d.package : undefined,
      version: typeof d.version === 'string' ? d.version : undefined
    })
  }
  return out
}
