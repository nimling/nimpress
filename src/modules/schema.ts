import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { parse as parseYamlText, stringify as stringifyYaml } from 'yaml'
import type { ControlSchema, ModuleFramework, ResolvedNimpressConfig } from '../types'
import {
  opaqueControls,
  schemaFromJsonSchema,
  schemaToJsonSchema,
  type ComponentJsonSchema,
  type ControlJsonSchema
} from './parse/typeMembers'
import { parseComponentSchema } from './componentData'
import { collectComponentPages, type ComponentPageRef } from './pages'
import { resolveComponentSource } from './resolve'

export type SchemaForm = 'json' | 'yml'

export interface SchemaFileRef {
  path: string
  form: SchemaForm
}

export function schemaFileIn(dir: string): SchemaFileRef | null {
  const yml = join(dir, 'schema.yml')
  if (existsSync(yml)) return { path: yml, form: 'yml' }
  const json = join(dir, 'schema.json')
  if (existsSync(json)) return { path: json, form: 'json' }
  return null
}

export function parseSchemaText(text: string, form: SchemaForm): ComponentJsonSchema {
  return (form === 'yml' ? parseYamlText(text) : JSON.parse(text)) as ComponentJsonSchema
}

export function renderSchemaText(schema: Record<string, unknown>, form: SchemaForm): string {
  return form === 'yml' ? stringifyYaml(schema) : JSON.stringify(schema, null, 2) + '\n'
}

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

const AUTHORED_KEYS = ['description', 'default', 'enum', 'mock', 'format', 'minimum', 'maximum', 'title'] as const
const STRUCTURAL_KEYS = ['type', 'tsType', 'bindable'] as const

function mergeNode(authored: ControlJsonSchema, fresh: ControlJsonSchema): ControlJsonSchema {
  const out: ControlJsonSchema = { ...authored }
  const outBag = out as unknown as Record<string, unknown>
  const freshBag = fresh as unknown as Record<string, unknown>
  for (const key of STRUCTURAL_KEYS) {
    if (freshBag[key] !== undefined) outBag[key] = freshBag[key]
  }
  if (fresh.type !== undefined && fresh.tsType === undefined) delete out.tsType
  if (fresh.required !== undefined) out.required = fresh.required
  for (const key of AUTHORED_KEYS) {
    if (outBag[key] === undefined && freshBag[key] !== undefined) outBag[key] = freshBag[key]
  }
  if (fresh.properties) {
    const properties: Record<string, ControlJsonSchema> = {}
    for (const [name, member] of Object.entries(fresh.properties)) {
      const own = authored.properties?.[name]
      properties[name] = own ? mergeNode(own, member) : member
    }
    for (const [name, member] of Object.entries(authored.properties ?? {})) {
      if (!(name in properties)) properties[name] = member
    }
    out.properties = properties
  }
  if (fresh.items) out.items = authored.items ? mergeNode(authored.items, fresh.items) : fresh.items
  if (fresh.additionalProperties) {
    out.additionalProperties = authored.additionalProperties
      ? mergeNode(authored.additionalProperties, fresh.additionalProperties)
      : fresh.additionalProperties
  }
  return out
}

export interface SchemaMergeReport {
  added: string[]
  missing: string[]
}

export function mergeComponentSchema(
  authored: ComponentJsonSchema,
  fresh: Record<string, unknown>
): { merged: Record<string, unknown>; report: SchemaMergeReport } {
  const freshTyped = fresh as ComponentJsonSchema & Record<string, unknown>
  const report: SchemaMergeReport = { added: [], missing: [] }
  const properties: Record<string, ControlJsonSchema> = {}
  for (const [name, member] of Object.entries(freshTyped.properties ?? {})) {
    const own = authored.properties?.[name]
    if (own) {
      properties[name] = mergeNode(own, member)
    } else {
      properties[name] = member
      report.added.push(name)
    }
  }
  for (const [name, member] of Object.entries(authored.properties ?? {})) {
    if (!(name in properties)) {
      properties[name] = member
      report.missing.push(`prop ${name}`)
    }
  }
  const slots: Record<string, ControlJsonSchema> = {}
  for (const [name, member] of Object.entries(freshTyped.slots ?? {})) {
    const own = authored.slots?.[name]
    slots[name] = own ? mergeNode(own, member) : member
  }
  for (const [name, member] of Object.entries(authored.slots ?? {})) {
    if (!(name in slots)) {
      slots[name] = member
      report.missing.push(`slot ${name}`)
    }
  }
  const emits = [...(freshTyped.emits ?? [])]
  for (const emit of authored.emits ?? []) {
    if (!emits.includes(emit)) {
      emits.push(emit)
      report.missing.push(`emit ${emit}`)
    }
  }
  const merged: Record<string, unknown> = { ...(authored as Record<string, unknown>), ...fresh, properties, slots, emits }
  return { merged, report }
}

export function schemaCoaching(component: string, schemaJson: ComponentJsonSchema, report?: SchemaMergeReport): string[] {
  const out: string[] = []
  const schema = schemaFromJsonSchema(component, schemaJson)
  const thin = schema.props.filter((p) => !p.description).map((p) => p.name)
  if (thin.length) {
    out.push(
      `${component} props without a description: ${thin.join(', ')} — describe them in the schema or above the type member in the source`
    )
  }
  for (const o of opaqueControls(schema.props)) {
    out.push(
      `${component}.${o.path} type ${o.type} is opaque, author it in the schema with enum or properties, or document the type in the component source`
    )
  }
  for (const name of report?.missing ?? []) {
    out.push(`${component} schema carries ${name} with no counterpart in the component source, remove it or restore the member`)
  }
  return out
}

export async function writeComponentSchema(
  dir: string,
  component: string,
  schema: ControlSchema | undefined
): Promise<void> {
  if (!schema) return
  const fresh = schemaToJsonSchema(component, schema.props, schema.slots, schema.emits)
  const found = schemaFileIn(dir)
  if (!found) {
    const schemaPath = join(dir, 'schema.json')
    await writeFile(schemaPath, renderSchemaText(fresh, 'json'))
    console.log(`nimpress modules: ${component} schema seeded at ${schemaPath} — the file is yours to author from here`)
    for (const warning of schemaCoaching(component, fresh as ComponentJsonSchema)) {
      console.warn(`nimpress modules: ${warning}`)
    }
    return
  }
  const raw = await readFile(found.path, 'utf-8')
  let authored: ComponentJsonSchema
  try {
    authored = parseSchemaText(raw, found.form)
  } catch (err) {
    console.warn(`nimpress modules: ${component} ${basename(found.path)} failed to parse, left untouched: ${String(err)}`)
    return
  }
  const { merged, report } = mergeComponentSchema(authored, fresh)
  const text = renderSchemaText(merged, found.form)
  if (text !== raw) {
    await writeFile(found.path, text)
    const added = report.added.length ? `, added ${report.added.join(', ')}` : ''
    console.log(`nimpress modules: ${component} schema upserted at ${found.path}${added}`)
  }
  for (const warning of schemaCoaching(component, merged as ComponentJsonSchema, report)) {
    console.warn(`nimpress modules: ${warning}`)
  }
}

export async function mergeSchemaLayer(dir: string, layer: ComponentJsonSchema): Promise<void> {
  const found = schemaFileIn(dir)
  if (!found) {
    await writeFile(join(dir, 'schema.json'), renderSchemaText(layer as Record<string, unknown>, 'json'))
    return
  }
  const raw = await readFile(found.path, 'utf-8')
  const existing = parseSchemaText(raw, found.form)
  const { merged } = mergeComponentSchema(layer, existing as unknown as Record<string, unknown>)
  await writeFile(found.path, renderSchemaText(merged, found.form))
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
      `[nimpress] modules: no source file found for ${page.system}/${page.component}, the schema upsert needs the component source`
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
  const found = schemaFileIn(target.pageDir)
  return relative(cwd, found?.path ?? join(target.pageDir, 'schema.json'))
}

export async function updateComponentSchemas(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  opts: { ref?: string; system?: string } = {}
): Promise<number> {
  if (opts.ref) {
    await upgradeComponentSchema(cwd, resolved, opts.ref)
    return 1
  }
  const pages = await collectComponentPages(cwd, resolved.contentDir)
  let count = 0
  for (const page of pages) {
    if (opts.system && page.system !== opts.system) continue
    const source = resolveComponentSource(cwd, resolved.modules, page.system, page.component, page.file)
    if (!source) {
      console.warn(`nimpress modules: no source for ${page.system}/${page.component}, skipped`)
      continue
    }
    const framework = frameworkFromFile(source.componentFile) ?? source.systemConfig.framework
    const schema = await parseSourceSchema(source.componentFile, framework, page.component)
    if (!schema) continue
    await writeComponentSchema(dirname(page.pageFile), page.component, schema)
    count++
  }
  return count
}
