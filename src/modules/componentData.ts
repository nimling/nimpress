import { existsSync, readdirSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type { ComponentPageData, ModulesConfig } from '../types'
import { parseVueComponent } from './parse/vue'
import { parseSvelteComponent } from './parse/svelte'
import { findComponentDts } from './parse/dts'
import { controlFromJsonSchema, controlToJsonSchema, mockNameFor, formatFor, schemaFromJsonSchema, type ControlJsonSchema, type ComponentJsonSchema } from './parse/typeMembers'
import type { ControlSpec } from '../types'
import { readComponentStories } from './stories'
import { resolveComponentSource } from './resolve'

export interface BuiltComponentData {
  data: ComponentPageData
  watchFiles: string[]
}

function srcRootFor(componentDir: string): string | null {
  let dir = componentDir
  for (let i = 0; i < 8; i++) {
    if (dir.endsWith('/src')) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
  return null
}

function scriptText(file: string, text: string): string {
  if (!file.endsWith('.vue') && !file.endsWith('.svelte')) return text
  return [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')
}

async function collectImportedTypes(
  componentDir: string,
  componentFile: string,
  text: string
): Promise<string> {
  const srcRoot = srcRootFor(componentDir)
  const seen = new Set<string>([resolve(componentFile)])
  const queue: Array<{ file: string; text: string; depth: number }> = [{ file: componentFile, text, depth: 0 }]
  let collected = ''
  while (queue.length) {
    const current = queue.shift()
    if (!current || current.depth >= 3) continue
    const body = scriptText(current.file, current.text)
    for (const m of body.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const spec = m[1]
      let base: string | null = null
      if (spec.startsWith('.')) base = resolve(dirname(current.file), spec)
      else if (spec.startsWith('@/') && srcRoot) base = resolve(srcRoot, spec.slice(2))
      if (!base || !isAbsolute(base)) continue
      const candidates = [base, `${base}.ts`, `${base}.vue`, join(base, 'index.ts')]
      const target = candidates.find((c) => statIsFile(c))
      if (!target) continue
      const key = resolve(target)
      if (seen.has(key) || seen.size > 50) continue
      seen.add(key)
      const targetText = await readFile(target, 'utf-8')
      collected += scriptText(target, targetText) + '\n'
      queue.push({ file: target, text: targetText, depth: current.depth + 1 })
    }
  }
  return collected
}

function statIsFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

export async function parseComponentSchema(
  componentDir: string,
  componentFile: string,
  framework: 'vue' | 'svelte',
  component: string
) {
  const text = await readFile(componentFile, 'utf-8')
  let extraTypes = ''
  for (const entry of readdirSync(componentDir)) {
    if (!entry.endsWith('.ts')) continue
    if (entry.endsWith('.stories.ts') || entry.endsWith('.story.ts')) continue
    extraTypes += await readFile(join(componentDir, entry), 'utf-8')
    extraTypes += '\n'
  }
  extraTypes += await collectImportedTypes(componentDir, componentFile, text)
  const parsed =
    framework === 'vue'
      ? parseVueComponent(text, component, extraTypes)
      : parseSvelteComponent(text, component, extraTypes)
  for (const p of parsed.props as ControlSpec[]) {
    if (!p.format) {
      const f = formatFor(p)
      if (f) p.format = f
    }
    if (!p.mock) p.mock = mockNameFor(p.name, controlToJsonSchema(p))
  }
  return parsed
}

export async function buildComponentPageData(opts: {
  cwd: string
  modules: ModulesConfig
  pageFile: string
  data: Record<string, unknown>
  editable: boolean
}): Promise<BuiltComponentData> {
  const { cwd, modules, pageFile, data, editable } = opts
  const system = String(data.system ?? '')
  const component = String(data.component ?? '')
  const fileOverride = typeof data.file === 'string' ? data.file : undefined
  const stories = await readComponentStories(dirname(pageFile))
  const source = resolveComponentSource(cwd, modules, system, component, fileOverride)
  const watchFiles: string[] = []

  let schema
  const schemaPath = join(dirname(pageFile), 'schema.json')
  if (existsSync(schemaPath)) {
    watchFiles.push(schemaPath)
    try {
      const raw = JSON.parse(await readFile(schemaPath, 'utf-8')) as ComponentJsonSchema
      schema = schemaFromJsonSchema(component, raw)
    } catch (err) {
      console.warn(`nimpress modules: ${system}/${component} schema.json failed to parse: ${String(err)}`)
    }
  } else {
    console.warn(
      `nimpress modules: ${system}/${component} has no schema.json, controls stay empty, run nimpress modules create --component=${component} --schema`
    )
  }

  let claudeMd: string | undefined
  let claudeMdPath: string | undefined
  if (source) {
    watchFiles.push(source.componentFile)
    claudeMdPath = relative(cwd, source.claudeMdPath)
    if (existsSync(source.claudeMdPath)) {
      claudeMd = await readFile(source.claudeMdPath, 'utf-8')
      watchFiles.push(source.claudeMdPath)
    }
  } else {
    const pkg = typeof data.package === 'string' ? data.package : modules.systems[system]?.package
    if (pkg) {
      const dtsPath = findComponentDts(cwd, pkg, component)
      if (dtsPath) {
        const packagedClaude = dtsPath.replace(/[^/]+$/, 'CLAUDE.md')
        if (existsSync(packagedClaude)) {
          claudeMd = await readFile(packagedClaude, 'utf-8')
        }
      }
    }
  }

  const controls =
    data.controls && typeof data.controls === 'object' && !Array.isArray(data.controls)
      ? (data.controls as Record<string, ControlJsonSchema>)
      : undefined
  if (controls) {
    schema = schema ?? { component, props: [], slots: [], emits: [] }
    const props = schema.props.map((p) =>
      controls[p.name] ? controlFromJsonSchema(p.name, controls[p.name], !!p.required) : p
    )
    for (const [key, member] of Object.entries(controls)) {
      if (!props.some((p) => p.name === key)) props.push(controlFromJsonSchema(key, member))
    }
    schema = { ...schema, props }
  }

  const route = modules.route.replace(/\/$/, '')
  return {
    data: {
      system,
      component,
      package: typeof data.package === 'string' ? data.package : undefined,
      version: typeof data.version === 'string' ? data.version : undefined,
      claudeMd,
      claudeMdPath,
      editable: editable && !!source,
      harnessPath: `${route}/${encodeURIComponent(system)}/${encodeURIComponent(component)}/`,
      schema,
      stories
    },
    watchFiles
  }
}
