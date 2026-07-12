import { existsSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import type { ComponentPageData, ModulesConfig } from '../types'
import { parseVueComponent } from './parse/vue'
import { parseSvelteComponent } from './parse/svelte'
import { findComponentDts, parseDtsSchema } from './parse/dts'
import { controlFromJsonSchema, type ControlJsonSchema } from './parse/typeMembers'
import { readComponentStories } from './stories'
import { resolveComponentSource } from './resolve'

export interface BuiltComponentData {
  data: ComponentPageData
  watchFiles: string[]
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
  return framework === 'vue'
    ? parseVueComponent(text, component, extraTypes)
    : parseSvelteComponent(text, component, extraTypes)
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
  let claudeMd: string | undefined
  let claudeMdPath: string | undefined
  if (source) {
    schema = await parseComponentSchema(
      source.componentDir,
      source.componentFile,
      source.systemConfig.framework,
      component
    )
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
        schema = parseDtsSchema(await readFile(dtsPath, 'utf-8'), component)
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
