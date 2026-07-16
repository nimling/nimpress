import { resolve, relative, dirname, basename, sep, join } from 'node:path'
import { existsSync, readFileSync, statSync, readdirSync, rmSync } from 'node:fs'
import matter from 'gray-matter'
import type { ResolvedNimpressConfig } from '../types'
import { lintContent } from '../plugin'
import { lintModules } from '../modules/lint'
import { walkFiles, hasFlag, finishLint } from './shared'

const scannedExtensions = ['.ts', '.tsx', '.js', '.mjs', '.vue', '.svelte']
const resolveSuffixes = ['', '.ts', '.tsx', '.js', '.mjs', '.vue', '.svelte', '/index.ts', '/index.js']
const kebab = /^[a-z0-9][a-z0-9.-]*$/
const pascal = /^[A-Z][A-Za-z0-9]*$/

interface AliasEntry {
  find: string
  replacement: string
}

export function viteAliases(vite: Record<string, unknown>): AliasEntry[] {
  const resolveBlock = vite.resolve
  if (!resolveBlock || typeof resolveBlock !== 'object') return []
  const alias = (resolveBlock as Record<string, unknown>).alias
  if (!alias || typeof alias !== 'object') return []
  if (Array.isArray(alias)) {
    return alias.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return []
      const { find, replacement } = entry as { find?: unknown; replacement?: unknown }
      if (typeof find !== 'string' || typeof replacement !== 'string') return []
      return [{ find, replacement }]
    })
  }
  return Object.entries(alias as Record<string, unknown>).flatMap(([find, replacement]) =>
    typeof replacement === 'string' ? [{ find, replacement }] : []
  )
}

function importSpecs(text: string): string[] {
  const out: string[] = []
  const patterns = [
    /(?:^|\n)[ \t]*import[^'"\n]*?from[ \t]*['"]([^'"\n]+)['"]/g,
    /(?:^|\n)[ \t]*export[^'"\n]*?from[ \t]*['"]([^'"\n]+)['"]/g,
    /(?:^|\n)[ \t]*import[ \t]+['"]([^'"\n]+)['"]/g,
    /\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/g
  ]
  for (const re of patterns) {
    let match
    while ((match = re.exec(text))) out.push(match[1])
  }
  return out
}

function resolvesToFile(base: string): boolean {
  return resolveSuffixes.some((suffix) => {
    const candidate = base + suffix
    if (!existsSync(candidate)) return false
    try {
      return statSync(candidate).isFile()
    } catch {
      return false
    }
  })
}

export function lintImports(cwd: string, resolved: ResolvedNimpressConfig): string[] {
  const root = resolve(cwd, resolved.contentDir)
  const aliases = viteAliases(resolved.vite)
  const problems: string[] = []
  for (const file of walkFiles(root)) {
    if (!scannedExtensions.some((ext) => file.endsWith(ext))) continue
    let text: string
    try {
      text = readFileSync(file, 'utf-8')
    } catch {
      continue
    }
    const label = relative(root, file).split(sep).join('/')
    for (const spec of importSpecs(text)) {
      if (spec.includes('_shared/') || spec.startsWith('_shared')) {
        problems.push(
          `${label}: imports ${spec}, shared fixture folders are forbidden, stories are self contained and shared setup lives in a group harness component`
        )
        continue
      }
      if (spec.startsWith('./') || spec.startsWith('../')) {
        const base = resolve(dirname(file), spec)
        if (!resolvesToFile(base)) problems.push(`${label}: unresolved import ${spec}, fix the path or create the file`)
        continue
      }
      const alias = aliases.find((a) => spec === a.find || spec.startsWith(a.find + '/'))
      if (alias) {
        const base = resolve(cwd, alias.replacement + spec.slice(alias.find.length))
        if (!resolvesToFile(base)) problems.push(`${label}: unresolved import ${spec} via alias ${alias.find}`)
      }
    }
  }
  return problems
}

export function lintStructure(cwd: string, resolved: ResolvedNimpressConfig): string[] {
  const root = resolve(cwd, resolved.contentDir)
  const problems: string[] = []
  if (!existsSync(root)) return [`${resolved.contentDir}: contentDir does not exist`]

  const componentDirs = new Map<string, string>()
  const mdByDir = new Map<string, string[]>()

  for (const file of walkFiles(root)) {
    const rel = relative(root, file).split(sep).join('/')
    const dir = dirname(file)
    const name = basename(file)

    if (name.endsWith('.md')) {
      const list = mdByDir.get(dir) ?? []
      list.push(file)
      mdByDir.set(dir, list)
      const stem = name.slice(0, -3)
      if (!kebab.test(stem)) {
        problems.push(`${rel}: markdown file names are lowercase kebab case, rename to ${stem.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9.-]+/g, '-')}.md`)
      }
      let data: Record<string, unknown> | undefined
      try {
        data = matter(readFileSync(file, 'utf-8')).data as Record<string, unknown>
      } catch {
        continue
      }
      if (data?.type === 'component') {
        const other = componentDirs.get(dir)
        if (other) {
          problems.push(`${rel}: second type component page in one folder, ${relative(root, other).split(sep).join('/')} already owns it, one component per folder`)
        } else {
          componentDirs.set(dir, file)
        }
      }
      if (data?.type === 'changelog' && typeof data.path === 'string') {
        problems.push(`${rel}: changelog entries never set path, the collection mounts at the folder route, remove the path field`)
      }
    }

    if (name.endsWith('.css') && !name.startsWith('_')) {
      const md = file.replace(/\.css$/, '.md')
      if (!existsSync(md)) {
        problems.push(`${rel}: page css without a matching ${basename(md)}, page styles are named after the page they scope`)
      }
    }
  }

  for (const [dir, mds] of mdByDir) {
    const rel = relative(root, dir).split(sep).join('/') || '.'
    const hasComponentPage = componentDirs.has(dir)
    let entries: string[] = []
    try {
      entries = readdirSync(dir)
    } catch {
      continue
    }
    const stories = entries.filter((e) => /\.story\.tsx?$/.test(e))
    if (stories.length && !hasComponentPage) {
      problems.push(`${rel}: story files without a type component page, add the component index.md or move the stories`)
    }
    if (entries.includes('schema.json') && !hasComponentPage) {
      problems.push(`${rel}: schema.json without a type component page, it belongs beside the component index.md`)
    }
    if (hasComponentPage && mds.length > 1) {
      const extras = mds.filter((m) => m !== componentDirs.get(dir)).map((m) => basename(m))
      problems.push(`${rel}: a component folder holds exactly one md file, move ${extras.join(', ')} out`)
    }
  }

  const walkDirs = (dir: string): void => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (e.name.startsWith('.') || e.name === 'node_modules') continue
      if (!kebab.test(e.name) && !pascal.test(e.name)) {
        const rel = relative(root, join(dir, e.name)).split(sep).join('/')
        problems.push(`${rel}/: folder names are lowercase kebab case, or PascalCase for component and group folders, rename it`)
      }
      walkDirs(join(dir, e.name))
    }
  }
  walkDirs(root)

  return problems
}

async function lintBuild(cwd: string, resolved: ResolvedNimpressConfig): Promise<string[]> {
  const outDir = '.nimpress-lint'
  const { runBuild } = await import('./site')
  try {
    await runBuild(cwd, { ...resolved, outDir })
    return []
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return message
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => `build: ${line.trim()}`)
  } finally {
    rmSync(join(cwd, outDir), { recursive: true, force: true })
  }
}

export async function runLint(cwd: string, resolved: ResolvedNimpressConfig): Promise<void> {
  const args = process.argv.slice(2)
  const problems = [
    ...lintStructure(cwd, resolved),
    ...(await lintContent(cwd, resolved.contentDir)),
    ...lintImports(cwd, resolved),
    ...(await lintModules(cwd, resolved))
  ]
  if (problems.length) {
    finishLint('nimpress lint', problems, '')
    return
  }
  console.log('nimpress lint: structure, frontmatter, imports, and modules ok')
  if (hasFlag(args, 'no-build')) return
  console.log('nimpress lint: building to verify the output compiles')
  const buildProblems = await lintBuild(cwd, resolved)
  finishLint('nimpress lint', buildProblems, 'nimpress lint: build ok, everything passes')
}
