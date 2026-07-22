import { join, relative, dirname } from 'node:path'
import { writeFileSync, readdirSync, mkdirSync, readFileSync } from 'node:fs'
import type { ResolvedNimpressConfig } from '../types'
import { flag, walkFiles } from './shared'

function exportFrontmatter(text: string): string | null {
  if (!text.startsWith('---\n')) return null
  const end = text.indexOf('\n---', 4)
  if (end < 0) return null
  return text.slice(4, end)
}

function exportTarget(fm: string): string | null {
  for (const line of fm.split('\n')) {
    if (!line.startsWith('export:')) continue
    const value = line.slice('export:'.length).trim().replace(/^["']|["']$/g, '')
    if (value === '' || value === 'false') return null
    return value
  }
  return null
}

export function rewriteExportedPage(text: string, version: string): string {
  const fm = exportFrontmatter(text)
  if (fm === null) return text
  const lines = fm.split('\n').filter((line) => !line.startsWith('export:') && !line.startsWith('  file:'))
  const packageAt = lines.findIndex((line) => line.startsWith('  package:'))
  if (version && packageAt >= 0 && !lines.some((line) => line.startsWith('  version:'))) {
    lines.splice(packageAt + 1, 0, `  version: ${JSON.stringify(version)}`)
  }
  return `---\n${lines.join('\n')}${text.slice(4 + fm.length)}`
}

export function runExport(cwd: string, resolved: ResolvedNimpressConfig, args: string[]): void {
  const target = flag(args, 'target') ?? ''
  const out = join(cwd, flag(args, 'out') ?? resolved.paths.export)
  const contentRoot = join(cwd, resolved.contentDir)
  let version = ''
  try {
    version = (JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8')) as { version?: string }).version ?? ''
  } catch {
    version = ''
  }
  let count = 0
  for (const file of walkFiles(contentRoot)) {
    if (!file.endsWith('.md')) continue
    const text = readFileSync(file, 'utf-8')
    const fm = exportFrontmatter(text)
    if (fm === null) continue
    const value = exportTarget(fm)
    if (value === null) continue
    if (target && value !== target && value !== 'true') continue
    const srcDir = dirname(file)
    const destDir = join(out, relative(contentRoot, srcDir))
    mkdirSync(destDir, { recursive: true })
    for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const data = readFileSync(join(srcDir, entry.name), 'utf-8')
      writeFileSync(
        join(destDir, entry.name),
        entry.name.endsWith('.md') ? rewriteExportedPage(data, version) : data
      )
    }
    count++
  }
  console.log(`nimpress export: ${count} pages collected into ${out}`)
}
