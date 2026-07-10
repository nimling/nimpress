import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import type { ModuleFramework, ResolvedNimpressConfig } from '../types'
import { readBalanced } from './parse/typeMembers'
import { generateAutoStories } from './autoStory'

export interface ImportOptions {
  source?: string
  stories?: string
  match?: string
  file?: string
  name?: string
}

interface MinedStory {
  name: string
  props?: Record<string, unknown>
  renderFn?: string
  scenario?: string
}

interface StoryModule {
  file: string
  text: string
  title?: string
  metaComponent?: string
  imports: string
  declarations: string
  dataModules: string[]
}

function jsonSafe(value: unknown): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(value, (key, v) => (typeof v === 'function' ? undefined : v)))
  } catch {
    return {}
  }
}

function walk(dir: string, out: string[] = []): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      walk(full, out)
    } else if (e.isFile()) {
      out.push(full)
    }
  }
  return out
}

function storyFileName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
}

function parseStoryModule(file: string): StoryModule {
  const text = readFileSync(file, 'utf-8')
  const lines = text.split('\n')
  const importStatements: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*import\b/.test(line)) {
      let statement = line
      while (
        !/from\s+["'][^"']+["'];?\s*$/.test(statement) &&
        !/^\s*import\s+["'][^"']+["'];?\s*$/.test(statement) &&
        i + 1 < lines.length
      ) {
        i++
        statement += '\n' + lines[i]
      }
      importStatements.push(statement)
      i++
      continue
    }
    if (/^\s*$/.test(line)) {
      i++
      continue
    }
    break
  }
  const dataModules = importStatements
    .map((s) => s.match(/from\s+["']\.\/([\w-]+)["']/)?.[1])
    .filter((s): s is string => !!s)
  const imports = importStatements
    .filter((s) => !s.includes('@storybook'))
    .map((s) => s.replace(/from\s+["']\.\/([\w-]+)["']/g, 'from "../../_shared/$1"'))
    .join('\n')
  let rest = text.slice(lines.slice(0, i).join('\n').length)
  const removeBlock = (startRe: RegExp) => {
    const at = rest.search(startRe)
    if (at < 0) return
    const brace = rest.indexOf('{', at)
    if (brace < 0) {
      rest = rest.slice(0, at) + rest.slice(rest.indexOf('\n', at) + 1)
      return
    }
    const block = readBalanced(rest, brace + 1)
    const end = brace + 1 + block.length + 1
    const tail = rest.slice(end).match(/^[^\n]*/)?.[0] ?? ''
    rest = rest.slice(0, at) + rest.slice(end + tail.length)
  }
  removeBlock(/^const meta\b[^\n]*/m)
  rest = rest.replace(/^export default meta;?\s*$/m, '')
  rest = rest.replace(/^type \w+[^\n]*$/gm, '')
  let guard = 0
  while (/^export const \w+/m.test(rest) && guard < 200) {
    removeBlock(/^export const \w+[^\n]*/m)
    guard++
  }
  return {
    file,
    text,
    title: text.match(/\btitle:\s*["']([^"']+)["']/)?.[1],
    metaComponent: text.match(/\bcomponent:\s*([A-Za-z_$][\w$]*)\s*[,\n}]/)?.[1],
    imports,
    declarations: rest.trim(),
    dataModules
  }
}

function mineStories(module: StoryModule): MinedStory[] {
  const out: MinedStory[] = []
  const re = /export const (\w+)(?::[^=]*)?=\s*\{/g
  let match
  while ((match = re.exec(module.text))) {
    const name = match[1]
    if (name === 'default' || name === 'meta') continue
    const body = readBalanced(module.text, re.lastIndex)
    const renderAt = body.search(/\brender\s*:/)
    if (renderAt >= 0) {
      const value = body.slice(body.indexOf(':', renderAt) + 1).trim()
      const parenIdx = value.indexOf('({')
      if (parenIdx >= 0) {
        const innerStart = value.indexOf('{', parenIdx)
        const inner = readBalanced(value, innerStart + 1)
        out.push({ name, renderFn: `() => ({${inner}})` })
        continue
      }
    }
    const argsIdx = body.search(/\bargs\s*:/)
    let props: Record<string, unknown> = {}
    if (argsIdx >= 0) {
      const braceIdx = body.indexOf('{', argsIdx)
      if (braceIdx >= 0) {
        const argsBody = readBalanced(body, braceIdx + 1)
        try {
          props = jsonSafe(new Function(`return {${argsBody}}`)())
        } catch {
          props = {}
        }
      }
    }
    out.push({ name, props })
  }
  return out
}

function packageExportNames(cwd: string, pkg: string): Map<string, string> {
  const map = new Map<string, string>()
  const index = join(cwd, 'node_modules', pkg, 'index.mjs')
  if (!existsSync(index)) return map
  const text = readFileSync(index, 'utf-8')
  for (const m of text.matchAll(/export \{ default as ([A-Za-z]+) \}/g)) {
    map.set(m[1].toLowerCase(), m[1])
  }
  return map
}

export async function importStorybook(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  system: string,
  opts: ImportOptions
): Promise<void> {
  const systemConfig = resolved.modules.systems[system]
  if (!systemConfig) throw new Error(`[nimpress] modules import: unknown system ${system}`)
  const framework: ModuleFramework = systemConfig.framework
  const ext = framework === 'vue' ? '.vue' : '.svelte'
  const docsRoot = join(cwd, resolved.contentDir, 'components')
  const sharedDir = join(docsRoot, '_shared')
  const pkg = systemConfig.package
  const matcher = opts.match ? new RegExp(opts.match) : null

  if (opts.file) {
    const abs = resolve(cwd, opts.file)
    if (!existsSync(abs)) throw new Error(`[nimpress] modules import: ${abs} not found`)
    if (extname(abs) !== ext) {
      throw new Error(`[nimpress] modules import: ${abs} does not match system framework ${framework}`)
    }
    const name = opts.name ?? basename(abs, ext)
    const sourceRoot = systemConfig.source ? resolve(cwd, systemConfig.source) : cwd
    const dir = join(docsRoot, 'Components', name)
    await mkdir(dir, { recursive: true })
    const fileRel = relative(sourceRoot, abs)
    await writeFile(join(dir, 'index.md'), pageMarkdown(system, name, pkg, fileRel))
    console.log(`nimpress modules: imported ${name} at ${relative(cwd, dir)}`)
    return
  }

  const sourceRoot = resolve(cwd, opts.source ?? systemConfig.source ?? '')
  if (!existsSync(sourceRoot)) {
    throw new Error(`[nimpress] modules import: source ${sourceRoot} not found`)
  }
  const files = walk(sourceRoot)
  const groupByComponent = new Map<string, string>()
  const modulesByComponent = new Map<string, StoryModule[]>()
  const csfFiles = files.filter((f) => f.endsWith('.stories.ts'))
  const extraDirs = opts.stories ? [resolve(cwd, opts.stories)] : []
  for (const dir of extraDirs) {
    for (const f of walk(dir)) {
      if (f.endsWith('.stories.ts')) csfFiles.push(f)
    }
  }
  const packageNames = pkg && !systemConfig.source ? packageExportNames(cwd, pkg) : null
  for (const csf of csfFiles) {
    const module = parseStoryModule(csf)
    if (module.title?.includes('/')) {
      const [group, name] = module.title.split('/')
      groupByComponent.set(name, group.replace(/\s+/g, ''))
    }
    const target = module.metaComponent ?? basename(csf, '.stories.ts')
    const canonical = packageNames?.get(target.toLowerCase()) ?? target
    const list = modulesByComponent.get(canonical) ?? []
    list.push(module)
    modulesByComponent.set(canonical, list)
    for (const dataModule of module.dataModules) {
      const from = join(dirname(csf), `${dataModule}.ts`)
      if (existsSync(from)) {
        await mkdir(sharedDir, { recursive: true })
        await copyFile(from, join(sharedDir, `${dataModule}.ts`))
      }
    }
  }

  const componentFiles = files.filter(
    (f) => f.endsWith(ext) && /^[A-Z][A-Za-z0-9]*$/.test(basename(f, ext))
  )
  const seen = new Map<string, string>()
  let pages = 0
  let stories = 0
  for (const file of componentFiles) {
    const name = basename(file, ext)
    if (matcher && !matcher.test(name)) continue
    if (seen.has(name)) {
      console.warn(`nimpress modules: skip duplicate ${name}, kept ${seen.get(name)}`)
      continue
    }
    seen.set(name, relative(sourceRoot, file))
    const group = groupByComponent.get(name) ?? 'Components'
    const dir = join(docsRoot, group, name)
    await mkdir(dir, { recursive: true })
    const rel = relative(sourceRoot, file)
    const canonical = rel === `${name}/${name}${ext}` || rel === `${name}${ext}`
    await writeFile(join(dir, 'index.md'), pageMarkdown(system, name, pkg, canonical ? undefined : rel))
    pages++
    const modules = modulesByComponent.get(name) ?? []
    for (const module of modules) {
      const scenario = basename(module.file, '.stories.ts')
      for (const story of mineStories(module)) {
        const displayName = scenario === name ? story.name : `${scenario} ${story.name}`
        let base = storyFileName(story.name)
        if (existsSync(join(dir, `${base}.story.ts`))) base = storyFileName(`${scenario}-${story.name}`)
        const target = join(dir, `${base}.story.ts`)
        if (existsSync(target)) continue
        await writeFile(target, storySource(framework, displayName, scenario, story, module))
        stories++
      }
    }
  }
  const auto = await generateAutoStories(cwd, resolved, system)
  console.log(
    `nimpress modules: imported ${pages} components with ${stories} stories and ${auto} auto stories for ${system}`
  )
}

function pageMarkdown(system: string, name: string, pkg: string | undefined, fileRel?: string): string {
  const packageLine = pkg ? `\n  package: "${pkg}"` : ''
  const fileLine = fileRel ? `\n  file: ${JSON.stringify(fileRel)}` : ''
  return `---
title: ${name}
type: component
data:
  system: ${system}
  component: ${name}${packageLine}${fileLine}
---

## Usage

\`\`\`ts
import { ${name} } from "${pkg ?? system}";
\`\`\`
`
}

function storySource(
  framework: ModuleFramework,
  displayName: string,
  scenario: string,
  story: MinedStory,
  module: StoryModule
): string {
  const helper = framework === 'vue' ? 'vueStory' : 'svelteStory'
  if (story.renderFn) {
    return `import { ${helper} } from '@nimling/nimpress/story'
${module.imports}

${module.declarations}

// story: ${displayName}
export default ${helper}({
  name: ${JSON.stringify(displayName)},
  description: ${JSON.stringify(`Scenario from ${scenario}`)},
  render: ${story.renderFn}
})
`
  }
  return `import { ${helper} } from '@nimling/nimpress/story'

// story: ${displayName}
export default ${helper}({
  name: ${JSON.stringify(displayName)},
  props: ${JSON.stringify(story.props ?? {}, null, 2)}
})
`
}
