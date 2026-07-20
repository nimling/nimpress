import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, sep } from 'node:path'
import type { ModuleFramework, ResolvedNimpressConfig } from '../types'
import { collectComponentPages } from './pages'
import { readComponentStories } from './stories'
import { resolveComponentSource } from './resolve'
import { parseSourceSchema, parseSchemaText, schemaCoaching, schemaFileIn } from './schema'
import { schemaToJsonSchema, type ComponentJsonSchema, type ControlJsonSchema } from './parse/typeMembers'

const helperFor: Record<ModuleFramework, string> = { vue: 'vueStory', svelte: 'svelteStory' }
const foreignExtFor: Record<ModuleFramework, string> = { vue: '.svelte', svelte: '.vue' }

function schemaHint(component: string): string {
  return `run nimpress modules update ${component}`
}

async function storyFiles(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries.filter((e) => e.isFile() && /\.story\.tsx?$/.test(e.name)).map((e) => e.name)
}

function enumMatchesType(values: unknown[], type: string): boolean {
  const expected = type === 'integer' ? 'number' : type
  return values.every((v) => typeof v === expected)
}

function structuralProblems(
  label: string,
  component: string,
  sourceRel: string,
  authored: ComponentJsonSchema,
  fresh: ComponentJsonSchema
): string[] {
  const problems: string[] = []
  const authoredProps = authored.properties ?? {}
  const freshProps = fresh.properties ?? {}
  for (const name of Object.keys(freshProps)) {
    if (!(name in authoredProps)) {
      problems.push(`${label}: prop ${name} is missing from the schema, ${schemaHint(component)}`)
    }
  }
  for (const name of Object.keys(authoredProps)) {
    if (!(name in freshProps)) {
      problems.push(`${label}: schema prop ${name} has no counterpart in ${sourceRel}, remove it or restore the prop`)
    }
  }
  for (const [name, authoredNode] of Object.entries(authoredProps)) {
    const freshNode = freshProps[name] as ControlJsonSchema | undefined
    if (!freshNode) continue
    if (authoredNode.type && freshNode.type && authoredNode.type !== freshNode.type && !authoredNode.enum) {
      problems.push(
        `${label}: prop ${name} schema type ${authoredNode.type} conflicts with source type ${freshNode.type}, ${schemaHint(component)}`
      )
    }
    if (authoredNode.enum && freshNode.type && !enumMatchesType(authoredNode.enum, freshNode.type)) {
      problems.push(`${label}: prop ${name} enum values mismatch the source type ${freshNode.type}`)
    }
    if (authoredNode.enum && freshNode.enum) {
      const allowed = new Set(freshNode.enum.map((v) => JSON.stringify(v)))
      const extras = authoredNode.enum.filter((v) => !allowed.has(JSON.stringify(v)))
      if (extras.length) {
        problems.push(
          `${label}: prop ${name} enum carries ${extras.map((v) => JSON.stringify(v)).join(', ')} outside the source union`
        )
      }
    }
  }
  const authoredSlots = authored.slots ?? {}
  const freshSlots = fresh.slots ?? {}
  for (const name of Object.keys(freshSlots)) {
    if (!(name in authoredSlots)) problems.push(`${label}: slot ${name} is missing from the schema, ${schemaHint(component)}`)
  }
  for (const name of Object.keys(authoredSlots)) {
    if (!(name in freshSlots)) problems.push(`${label}: schema slot ${name} has no counterpart in ${sourceRel}`)
  }
  const authoredEmits = new Set(authored.emits ?? [])
  const freshEmits = new Set(fresh.emits ?? [])
  for (const name of freshEmits) {
    if (!authoredEmits.has(name)) problems.push(`${label}: emit ${name} is missing from the schema, ${schemaHint(component)}`)
  }
  for (const name of authoredEmits) {
    if (!freshEmits.has(name)) problems.push(`${label}: schema emit ${name} has no counterpart in ${sourceRel}`)
  }
  return problems
}

export async function lintModules(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  system?: string
): Promise<string[]> {
  const systems = system ? [system] : Object.keys(resolved.modules.systems)
  const problems: string[] = []
  const pages = await collectComponentPages(cwd, resolved.contentDir)
  for (const name of systems) {
    const systemConfig = resolved.modules.systems[name]
    if (!systemConfig) {
      problems.push(`${name}: not a configured system`)
      continue
    }
    const framework = systemConfig.framework
    const wrongHelper = helperFor[framework === 'vue' ? 'svelte' : 'vue']
    const foreignExt = foreignExtFor[framework]
    for (const page of pages) {
      if (page.system !== name) continue
      const dir = dirname(page.pageFile)
      const label = relative(cwd, dir).split(sep).join('/')

      const files = await storyFiles(dir)
      if (!files.length) {
        problems.push(`${label}: no story, run nimpress modules story --system=${name} ${page.component}`)
      }
      const propsExempt = new Set<string>()
      for (const file of files) {
        let raw: string
        try {
          raw = await readFile(join(dir, file), 'utf-8')
        } catch {
          continue
        }
        if (/\bharness\s*:/.test(raw) || /\brender\s*:/.test(raw)) propsExempt.add(file)
        if (raw.includes(wrongHelper)) {
          problems.push(`${label}/${file}: uses ${wrongHelper} inside the ${framework} system ${name}`)
        }
        for (const match of raw.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
          if (extname(match[1]) === foreignExt) {
            problems.push(`${label}/${file}: imports ${match[1]} inside the ${framework} system ${name}`)
          }
        }
      }

      const source = resolveComponentSource(cwd, resolved.modules, name, page.component, page.file)
      if (source && extname(source.componentFile) === foreignExt) {
        problems.push(
          `${label}: component file ${relative(cwd, source.componentFile)} mismatches the ${framework} system ${name}`
        )
      }

      if (existsSync(join(dir, 'schema.json')) && existsSync(join(dir, 'schema.yml'))) {
        problems.push(`${label}: both schema.json and schema.yml exist, keep one`)
        continue
      }
      const schemaFile = schemaFileIn(dir)
      if (!schemaFile) {
        problems.push(`${label}: schema file missing, ${schemaHint(page.component)}`)
        continue
      }
      let schemaRaw: string
      try {
        schemaRaw = await readFile(schemaFile.path, 'utf-8')
      } catch {
        problems.push(`${label}: ${schemaFile.form} schema unreadable`)
        continue
      }
      let authored: ComponentJsonSchema
      try {
        authored = parseSchemaText(schemaRaw, schemaFile.form)
      } catch {
        problems.push(`${label}: schema is not valid ${schemaFile.form}, fix it by hand`)
        continue
      }
      const properties = new Set(Object.keys(authored.properties ?? {}))

      for (const story of await readComponentStories(dir)) {
        if (propsExempt.has(story.file)) continue
        for (const key of Object.keys(story.props ?? {})) {
          if (!properties.has(key)) {
            problems.push(`${label}/${story.file}: prop ${key} is absent from the schema, ${schemaHint(page.component)}`)
          }
        }
      }

      if (source) {
        const fresh = await parseSourceSchema(source.componentFile, framework, page.component)
        if (fresh) {
          const freshJson = schemaToJsonSchema(page.component, fresh.props, fresh.slots, fresh.emits) as ComponentJsonSchema
          problems.push(
            ...structuralProblems(label, page.component, relative(cwd, source.componentFile), authored, freshJson)
          )
        }
      }
      for (const warning of schemaCoaching(page.component, authored)) {
        console.warn(`nimpress modules lint: ${warning}`)
      }
    }
  }
  return problems
}
