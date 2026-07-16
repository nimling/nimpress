import { resolve, relative, dirname, sep } from 'node:path'
import { existsSync, readFileSync, statSync } from 'node:fs'
import type { ResolvedNimpressConfig } from '../types'
import { lintContent } from '../plugin'
import { walkFiles, finishLint } from './shared'

const scannedExtensions = ['.ts', '.tsx', '.js', '.mjs', '.vue', '.svelte']
const resolveSuffixes = ['', '.ts', '.tsx', '.js', '.mjs', '.vue', '.svelte', '/index.ts', '/index.js']

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
        if (!resolvesToFile(base)) problems.push(`${label}: unresolved import ${spec}`)
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

export async function runLint(cwd: string, resolved: ResolvedNimpressConfig): Promise<void> {
  const problems = [...(await lintContent(cwd, resolved.contentDir)), ...lintImports(cwd, resolved)]
  finishLint('nimpress lint', problems, 'nimpress lint: frontmatter and imports ok')
}
