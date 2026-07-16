import { join, relative } from 'node:path'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { ModuleFramework, ResolvedNimpressConfig } from '../types'
import { generateAutoStory, generateAutoStories, createComponentPage } from '../modules/autoStory'
import { importStorybook } from '../modules/importStorybook'
import { lintModules } from '../modules/lint'
import { upgradeComponentSchema } from '../modules/schema'
import { flag, hasFlag, finishLint } from './shared'
import { startHarnessServers, buildHarnesses, deployableSystems } from './site'

export async function runModules(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  args: string[]
): Promise<void> {
  const sub = args[0]
  const configured = Object.keys(resolved.modules.systems)
  const named = args[1] && !args[1].startsWith('--') ? [args[1]] : null
  if (named && !configured.includes(named[0])) {
    throw new Error(`[nimpress] modules: unknown system ${named[0]}, configured: ${configured.join(', ') || 'none'}`)
  }
  if (sub === 'init') {
    runModulesInit(cwd, resolved)
    return
  }
  if (sub === 'dev') {
    const systems = named ?? configured
    if (!systems.length) throw new Error('[nimpress] modules dev: no systems configured')
    await startHarnessServers(cwd, resolved, systems)
    await new Promise(() => {})
  }
  if (sub === 'build') {
    const systems = named ?? deployableSystems(resolved)
    if (!systems.length) throw new Error('[nimpress] modules build: no systems configured')
    await buildHarnesses(cwd, resolved, systems)
    return
  }
  if (sub === 'lint') {
    const problems = await lintModules(cwd, resolved, named?.[0])
    finishLint('nimpress modules lint', problems, 'nimpress modules lint: systems, schemas, and stories ok')
    return
  }
  if (sub === 'story') {
    const system = named?.[0]
    if (!system) throw new Error('[nimpress] modules story expects a system: nimpress modules story <system> [component]')
    const component = args[2] && !args[2].startsWith('--') ? args[2] : null
    const framework = flag(args, 'framework') as ModuleFramework | undefined
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
    const system = named?.[0]
    if (!system) throw new Error('[nimpress] modules import expects a system: nimpress modules import <system> [file]')
    const file = args[2] && !args[2].startsWith('--') ? args[2] : undefined
    await importStorybook(cwd, resolved, system, {
      file,
      name: flag(args, 'name'),
      source: flag(args, 'source'),
      stories: flag(args, 'stories'),
      match: flag(args, 'match'),
      fromStories: args.includes('--from-stories'),
      select: args.includes('--select')
    })
    return
  }
  if (sub === 'create') {
    const componentRef = flag(args, 'component')
    if (componentRef) {
      if (!hasFlag(args, 'schema')) {
        throw new Error('[nimpress] modules create --component expects --schema to regenerate schema.json')
      }
      const written = await upgradeComponentSchema(cwd, resolved, componentRef)
      console.log(`nimpress modules: schema upgraded at ${written}`)
      return
    }
    const system = named?.[0]
    const component = args[2] && !args[2].startsWith('--') ? args[2] : null
    if (!system || !component) {
      throw new Error('[nimpress] modules create expects: nimpress modules create <system> <Component>, or --component=<ref> --schema')
    }
    const framework = flag(args, 'framework') as ModuleFramework | undefined
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
