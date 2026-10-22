import { join, relative, dirname, basename } from 'node:path'
import { writeFileSync, readdirSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import type { ResolvedNimpressConfig } from '../types'
import { flag, walkFiles } from './shared'

interface ExportSpec {
  target: string
  gate: string
  set: boolean
  off: boolean
}

const unset: ExportSpec = { target: '', gate: '', set: false, off: false }

function exportFrontmatter(text: string): string | null {
  if (!text.startsWith('---\n')) return null
  const end = text.indexOf('\n---', 4)
  if (end < 0) return null
  return text.slice(4, end)
}

function unquote(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '')
}

function readExport(fm: string): ExportSpec {
  const lines = fm.split('\n')
  const at = lines.findIndex((line) => line.startsWith('export:'))
  if (at < 0) return unset
  const value = unquote(lines[at].slice('export:'.length))
  if (value === 'false') return { ...unset, set: true, off: true }
  if (value !== '') return { ...unset, target: value, set: true }
  const spec: ExportSpec = { ...unset, set: true }
  for (const nested of lines.slice(at + 1)) {
    if (!nested.startsWith('  ')) break
    const [key, ...rest] = nested.trim().split(':')
    if (key === 'target') spec.target = unquote(rest.join(':'))
    if (key === 'gate') spec.gate = unquote(rest.join(':'))
  }
  if (!spec.target) spec.target = 'true'
  return spec
}

function readSpec(file: string): ExportSpec {
  if (!existsSync(file)) return unset
  const fm = exportFrontmatter(readFileSync(file, 'utf-8'))
  return fm === null ? unset : readExport(fm)
}

function folderSpec(contentRoot: string, dir: string, cache: Map<string, ExportSpec>): ExportSpec {
  const known = cache.get(dir)
  if (known) return known
  const own = readSpec(join(dir, 'index.md'))
  const inherited = dir === contentRoot || !dir.startsWith(contentRoot) ? unset : folderSpec(contentRoot, dirname(dir), cache)
  const spec = own.set ? (own.off ? unset : own) : inherited
  cache.set(dir, spec)
  return spec
}

export function rewriteExportedPage(text: string, version: string, gate = ''): string {
  const fm = exportFrontmatter(text)
  if (fm === null) return text
  const lines: string[] = []
  let inExport = false
  for (const line of fm.split('\n')) {
    if (inExport && line.startsWith('  ')) continue
    inExport = line.startsWith('export:')
    if (inExport || line.startsWith('  file:')) continue
    lines.push(line)
  }
  const packageAt = lines.findIndex((line) => line.startsWith('  package:'))
  if (version && packageAt >= 0 && !lines.some((line) => line.startsWith('  version:'))) {
    lines.splice(packageAt + 1, 0, `  version: ${JSON.stringify(version)}`)
  }
  if (gate && !lines.some((line) => line.startsWith('gate:'))) lines.push(`gate: ${gate}`)
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
  const folders = new Map<string, ExportSpec>()
  const pages = new Map<string, { spec: ExportSpec; folder: boolean }>()
  for (const file of walkFiles(contentRoot)) {
    if (!file.endsWith('.md')) continue
    const fm = exportFrontmatter(readFileSync(file, 'utf-8'))
    if (fm === null) continue
    const own = readExport(fm)
    const folder = folderSpec(contentRoot, dirname(file), folders)
    const inFolder = folder.set && !(own.set && own.off) && (!own.set || basename(file) === 'index.md')
    const spec = inFolder ? folder : own
    if (!spec.set || spec.off) continue
    if (target && spec.target !== target && spec.target !== 'true') continue
    pages.set(file, { spec, folder: inFolder })
  }
  const written = new Set<string>()
  for (const [file, page] of pages) {
    const srcDir = dirname(file)
    for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const src = join(srcDir, entry.name)
      if (written.has(src)) continue
      let gate = page.spec.gate
      if (entry.name.endsWith('.md')) {
        const other = pages.get(src)
        if (!other && page.folder) continue
        if (other) gate = other.spec.gate
      }
      const dest = join(out, relative(contentRoot, src))
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, entry.name.endsWith('.md') ? rewriteExportedPage(readFileSync(src, 'utf-8'), version, gate) : readFileSync(src))
      written.add(src)
    }
  }
  console.log(`nimpress export: ${pages.size} pages collected into ${out}`)
}
