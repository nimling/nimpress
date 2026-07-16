import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import type { ControlSchema, ModuleFramework, ResolvedNimpressConfig } from '../types'
import { opaqueControls, schemaToJsonSchema } from './parse/typeMembers'
import { parseComponentSchema } from './componentData'
import { collectComponentPages, type ComponentPageRef } from './pages'
import { resolveComponentSource } from './resolve'

export async function parseSourceSchema(
  componentFile: string,
  framework: ModuleFramework,
  component: string
): Promise<ControlSchema | undefined> {
  try {
    return await parseComponentSchema(dirname(componentFile), componentFile, framework, component)
  } catch (err) {
    console.warn(`nimpress modules: schema parse failed for ${component}: ${String(err)}`)
    return undefined
  }
}

export function renderComponentSchema(component: string, schema: ControlSchema): string {
  return JSON.stringify(schemaToJsonSchema(component, schema.props, schema.slots, schema.emits), null, 2) + '\n'
}

export async function writeComponentSchema(
  dir: string,
  component: string,
  schema: ControlSchema | undefined
): Promise<void> {
  if (!schema) return
  const schemaPath = join(dir, 'schema.json')
  await writeFile(schemaPath, renderComponentSchema(component, schema))
  const opaque = opaqueControls(schema.props)
  const thin = schema.props.filter((p) => !p.description).map((p) => p.name)
  console.log(
    `nimpress modules: ${component} schema written to ${schemaPath} — ${schema.props.length - thin.length}/${schema.props.length} props documented`
  )
  if (thin.length) {
    console.warn(`nimpress modules: ${component} props missing a description: ${thin.join(', ')}`)
  }
  for (const o of opaque) {
    console.warn(
      `nimpress modules: ${component}.${o.path} type ${o.type} is opaque, document it in the component file or a sibling .types.ts so the parser resolves it`
    )
  }
}

export interface ComponentTarget {
  system: string
  component: string
  framework: ModuleFramework
  componentFile: string
  pageDir: string
}

function frameworkFromFile(file: string): ModuleFramework | null {
  const ext = extname(file)
  if (ext === '.vue') return 'vue'
  if (ext === '.svelte') return 'svelte'
  return null
}

function systemForFile(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  componentFile: string
): string | null {
  for (const [name, systemConfig] of Object.entries(resolved.modules.systems)) {
    if (!systemConfig.source) continue
    const root = resolve(cwd, systemConfig.source)
    if (componentFile.startsWith(root + '/') || componentFile.startsWith(root + '\\')) return name
  }
  return null
}

function pageFor(pages: ComponentPageRef[], system: string, component: string): ComponentPageRef | undefined {
  return pages.find((p) => p.system === system && p.component === component)
}

export async function resolveComponentTarget(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  ref: string
): Promise<ComponentTarget> {
  const pages = await collectComponentPages(cwd, resolved.contentDir)
  const asPath = resolve(cwd, ref)
  if ((ref.includes('/') || ref.includes('\\')) && existsSync(asPath)) {
    const framework = frameworkFromFile(asPath)
    if (!framework) {
      throw new Error(`[nimpress] modules: ${ref} is not a .vue or .svelte component file`)
    }
    const component = basename(asPath, extname(asPath))
    const system = systemForFile(cwd, resolved, asPath)
    if (!system) {
      throw new Error(`[nimpress] modules: ${ref} sits under no configured system source`)
    }
    const page = pageFor(pages, system, component)
    if (!page) {
      throw new Error(
        `[nimpress] modules: no component page found for ${system}/${component}, run nimpress modules create ${system} ${component} first`
      )
    }
    return { system, component, framework, componentFile: asPath, pageDir: dirname(page.pageFile) }
  }
  const matches = pages.filter((p) => p.component === ref)
  if (!matches.length) {
    throw new Error(`[nimpress] modules: no component page found for ${ref}`)
  }
  if (matches.length > 1) {
    const list = matches.map((m) => `${m.system}/${m.component}`).join(', ')
    throw new Error(`[nimpress] modules: ${ref} is ambiguous across ${list}, pass the component file path`)
  }
  const page = matches[0]
  const source = resolveComponentSource(cwd, resolved.modules, page.system, page.component, page.file)
  if (!source) {
    throw new Error(
      `[nimpress] modules: no source file found for ${page.system}/${page.component}, schema regeneration needs the component source`
    )
  }
  const framework = frameworkFromFile(source.componentFile) ?? source.systemConfig.framework
  return {
    system: page.system,
    component: page.component,
    framework,
    componentFile: source.componentFile,
    pageDir: dirname(page.pageFile)
  }
}

export async function upgradeComponentSchema(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  ref: string
): Promise<string> {
  const target = await resolveComponentTarget(cwd, resolved, ref)
  const schema = await parseSourceSchema(target.componentFile, target.framework, target.component)
  if (!schema) {
    throw new Error(`[nimpress] modules: schema parse produced nothing for ${target.component}`)
  }
  await writeComponentSchema(target.pageDir, target.component, schema)
  return relative(cwd, join(target.pageDir, 'schema.json'))
}
