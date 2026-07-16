import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, sep } from 'node:path'
import type { ModuleFramework, ResolvedNimpressConfig } from '../types'
import { collectComponentPages } from './pages'
import { readComponentStories } from './stories'
import { resolveComponentSource } from './resolve'
import { parseSourceSchema, renderComponentSchema } from './schema'

const helperFor: Record<ModuleFramework, string> = { vue: 'vueStory', svelte: 'svelteStory' }
const foreignExtFor: Record<ModuleFramework, string> = { vue: '.svelte', svelte: '.vue' }

function schemaHint(component: string): string {
  return `run nimpress modules create --component=${component} --schema`
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

function schemaProperties(raw: string): Set<string> | null {
  try {
    const parsed = JSON.parse(raw) as { properties?: Record<string, unknown> }
    return new Set(Object.keys(parsed.properties ?? {}))
  } catch {
    return null
  }
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

      const schemaPath = join(dir, 'schema.json')
      if (!existsSync(schemaPath)) {
        problems.push(`${label}: schema.json missing, ${schemaHint(page.component)}`)
        continue
      }
      let schemaRaw: string
      try {
        schemaRaw = await readFile(schemaPath, 'utf-8')
      } catch {
        problems.push(`${label}: schema.json unreadable`)
        continue
      }
      const properties = schemaProperties(schemaRaw)
      if (!properties) {
        problems.push(`${label}: schema.json is not valid json, ${schemaHint(page.component)}`)
        continue
      }

      for (const story of await readComponentStories(dir)) {
        if (propsExempt.has(story.file)) continue
        for (const key of Object.keys(story.props ?? {})) {
          if (!properties.has(key)) {
            problems.push(`${label}/${story.file}: prop ${key} is absent from schema.json, ${schemaHint(page.component)}`)
          }
        }
      }

      if (source) {
        const fresh = await parseSourceSchema(source.componentFile, framework, page.component)
        if (fresh && renderComponentSchema(page.component, fresh) !== schemaRaw) {
          problems.push(
            `${label}: schema.json is out of date with ${relative(cwd, source.componentFile)}, ${schemaHint(page.component)}`
          )
        }
      }
    }
  }
  return problems
}
