import { join, relative } from 'node:path'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { ModuleFramework, ResolvedNimpressConfig } from '../types'
import { generateAutoStory, generateAutoStories, createComponentPage } from '../modules/autoStory'
import { importStorybook } from '../modules/importStorybook'
import { lintModules } from '../modules/lint'
import { upgradeComponentSchema } from '../modules/schema'
import { flag, hasFlag, positional, finishLint } from './shared'
import { startHarnessServers, buildHarnesses, deployableSystems } from './site'

function systemFlag(resolved: ResolvedNimpressConfig, args: string[]): string | undefined {
  const named = flag(args, 'system')
  if (named === undefined) return undefined
  const configured = Object.keys(resolved.modules.systems)
  if (!configured.includes(named)) {
    throw new Error(`[nimpress] modules: unknown system ${named}, configured: ${configured.join(', ') || 'none'}`)
  }
  return named
}

function requireSystem(resolved: ResolvedNimpressConfig, args: string[], sub: string): string {
  const named = systemFlag(resolved, args)
  if (named) return named
  const configured = Object.keys(resolved.modules.systems)
  if (configured.length === 1) return configured[0]
  if (!configured.length) throw new Error(`[nimpress] modules ${sub}: no systems configured`)
  throw new Error(
    `[nimpress] modules ${sub}: several systems configured (${configured.join(', ')}), pass --system=<name>`
  )
}

export async function runModules(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  args: string[]
): Promise<void> {
  const sub = args[0]
  const rest = args.slice(1)
  const configured = Object.keys(resolved.modules.systems)
  if (sub === 'init') {
    runModulesInit(cwd, resolved)
    return
  }
  if (sub === 'dev') {
    const named = systemFlag(resolved, rest)
    const systems = named ? [named] : configured
    if (!systems.length) throw new Error('[nimpress] modules dev: no systems configured')
    await startHarnessServers(cwd, resolved, systems)
    await new Promise(() => {})
  }
  if (sub === 'build') {
    const named = systemFlag(resolved, rest)
    const systems = named ? [named] : deployableSystems(resolved)
    if (!systems.length) throw new Error('[nimpress] modules build: no systems configured')
    await buildHarnesses(cwd, resolved, systems)
    return
  }
  if (sub === 'lint') {
    const problems = await lintModules(cwd, resolved, systemFlag(resolved, rest))
    finishLint('nimpress modules lint', problems, 'nimpress modules lint: systems, schemas, and stories ok')
    return
  }
  if (sub === 'story') {
    const system = requireSystem(resolved, rest, 'story')
    const component = positional(rest, 0)
    const framework = flag(rest, 'framework') as ModuleFramework | undefined
    if (component) {
      const target = await generateAutoStory(cwd, resolved, system, component, framework)
      if (target) console.log(`nimpress modules: story written to ${target}`)
      return
    }
    const written = await generateAutoStories(cwd, resolved, system)
    console.log(`nimpress modules: ${written} auto stories written for ${system}`)
    return
  }
  if (sub === 'import') {
    const system = requireSystem(resolved, rest, 'import')
    const file = positional(rest, 0)
    await importStorybook(cwd, resolved, system, {
      file,
      name: flag(rest, 'name'),
      source: flag(rest, 'source'),
      stories: flag(rest, 'stories'),
      match: flag(rest, 'match'),
      fromStories: rest.includes('--from-stories'),
      select: rest.includes('--select')
    })
    return
  }
  if (sub === 'create') {
    const componentRef = flag(rest, 'component')
    if (componentRef) {
      if (!hasFlag(rest, 'schema')) {
        throw new Error('[nimpress] modules create --component expects --schema to regenerate schema.json')
      }
      const written = await upgradeComponentSchema(cwd, resolved, componentRef)
      console.log(`nimpress modules: schema upgraded at ${written}`)
      return
    }
    const component = positional(rest, 0)
    if (!component) {
      throw new Error('[nimpress] modules create expects: nimpress modules create <Component> [--system=<name>], or --component=<ref> --schema')
    }
    const system = requireSystem(resolved, rest, 'create')
    const framework = flag(rest, 'framework') as ModuleFramework | undefined
    const dir = await createComponentPage(cwd, resolved, system, component, framework)
    console.log(`nimpress modules: created ${component} at ${relative(cwd, dir)}`)
    return
  }
  throw new Error('[nimpress] modules expects init, dev, build, lint, story, import or create')
}

function runModulesInit(cwd: string, resolved: ResolvedNimpressConfig): void {
  const dir = join(cwd, resolved.modules.dir)
  mkdirSync(dir, { recursive: true })
  const configPath = join(cwd, 'nimpress.config.json')
  if (existsSync(configPath)) {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>
    if (!raw.modules) {
      raw.modules = { dir: resolved.modules.dir, route: resolved.modules.route, systems: {} }
      writeFileSync(configPath, JSON.stringify(raw, null, 2) + '\n')
      console.log(`nimpress modules: modules block added to ${configPath}`)
    }
  } else {
    console.log('nimpress modules: add a modules block with systems entries to your nimpress config')
  }
  console.log(`nimpress modules: folder ready at ${dir}`)
}
