import { dirname, join, relative } from 'node:path'
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import type { ModuleFramework, ResolvedNimpressConfig } from '../types'
import { cacheDir } from '../config/paths'
import { generateAutoStory, generateAutoStories, createComponentPage } from '../modules/autoStory'
import { importStorybook } from '../modules/importStorybook'
import { collectStoryRoutes, harnessStoryUrl, resolveStoryRoute, type StoryRoute } from '../modules/stories'
import { lintModules } from '../modules/lint'
import { flushDiagnostics, updateComponentSchemas, upgradeComponentSchema } from '../modules/schema'
import { flag, hasFlag, positional, finishLint } from './shared'
import { startHarnessServers, buildHarnesses, deployableSystems } from './site'
import { openBrowser } from './view'

const harnessStartMs = 60000

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
  if (sub === 'stories') {
    const component = positional(rest, 0)
    const routes = await componentRoutes(cwd, resolved, 'stories', component, systemFlag(resolved, rest))
    if (hasFlag(rest, 'json')) {
      console.log(JSON.stringify(routes, null, 2))
      return
    }
    if (!component) {
      const counts = new Map<string, number>()
      for (const r of routes) counts.set(`${r.system}\t${r.component}`, (counts.get(`${r.system}\t${r.component}`) ?? 0) + 1)
      for (const [ref, count] of counts) console.log(`${ref}\t${count}`)
      return
    }
    for (const r of routes) console.log(`${r.system}\t${r.component}\t${r.story}\t${r.route}`)
    return
  }
  if (sub === 'open') {
    const component = positional(rest, 0)
    if (!component) {
      throw new Error('[nimpress] modules open expects: nimpress modules open <Component> [story] [--system=<name>] [--browser=<app>]')
    }
    const routes = await componentRoutes(cwd, resolved, 'open', component, systemFlag(resolved, rest))
    const systems = routes.map((r) => r.system).filter((name, i, all) => all.indexOf(name) === i)
    if (systems.length > 1) {
      throw new Error(`[nimpress] modules open: ${component} is in several systems (${systems.join(', ')}), pass --system=<name>`)
    }
    const story = positional(rest, 1)
    const route = resolveStoryRoute(routes, story)
    if (!route) {
      throw new Error(
        `[nimpress] modules open: no story ${story} for ${routes[0].system}/${routes[0].component}, stories: ${routes.map((r) => r.story).join(', ')}`
      )
    }
    const url = harnessStoryUrl(resolved, route)
    await ensureHarness(cwd, resolved, route, url)
    openBrowser(url, flag(rest, 'browser'))
    console.log(`nimpress modules open: ${route.system}/${route.component} ${route.story} at ${url}`)
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
    flushDiagnostics(cwd)
    return
  }
  if (sub === 'update') {
    const ref = flag(rest, 'component') ?? positional(rest, 0)
    const count = await updateComponentSchemas(cwd, resolved, { ref, system: systemFlag(resolved, rest) })
    console.log(`nimpress modules: ${count} schema${count === 1 ? '' : 's'} upserted`)
    flushDiagnostics(cwd)
    return
  }
  if (sub === 'create') {
    const componentRef = flag(rest, 'component')
    if (componentRef) {
      if (!hasFlag(rest, 'schema')) {
        throw new Error('[nimpress] modules create --component expects --schema to upsert the schema')
      }
      const written = await upgradeComponentSchema(cwd, resolved, componentRef)
      console.log(`nimpress modules: schema upserted at ${written}`)
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
  throw new Error('[nimpress] modules expects init, dev, build, lint, story, stories, open, import, create or update')
}

async function componentRoutes(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  sub: string,
  component: string | undefined,
  system: string | undefined
): Promise<StoryRoute[]> {
  const routes = await collectStoryRoutes(cwd, resolved, { component, system })
  if (component && !routes.length) {
    const near = (await collectStoryRoutes(cwd, resolved, { system }))
      .map((r) => `${r.system}/${r.component}`)
      .filter((ref, i, all) => all.indexOf(ref) === i && ref.toLowerCase().includes(component.toLowerCase()))
    throw new Error(
      `[nimpress] modules ${sub}: no stories for ${component}${system ? ` in ${system}` : ''}` +
        (near.length ? `, did you mean ${near.slice(0, 8).join(', ')}` : '')
    )
  }
  return routes
}

async function harnessStatus(url: string): Promise<number | undefined> {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(2000) })).status
  } catch {
    return undefined
  }
}

async function ensureHarness(cwd: string, resolved: ResolvedNimpressConfig, route: StoryRoute, url: string): Promise<void> {
  let status = await harnessStatus(url)
  if (status === undefined) {
    const log = cacheDir(cwd, resolved, 'modules', 'dev.log')
    mkdirSync(dirname(log), { recursive: true })
    const out = openSync(log, 'a')
    const child = spawn(process.execPath, [process.argv[1], 'dev'], { cwd, detached: true, stdio: ['ignore', out, out] })
    child.unref()
    let exited = false
    child.on('exit', () => (exited = true))
    console.log(`nimpress modules open: started nimpress dev in the background, pid ${child.pid}, log ${relative(cwd, log)}`)
    const deadline = Date.now() + harnessStartMs
    while (status === undefined && !exited && Date.now() < deadline) {
      await new Promise((done) => setTimeout(done, 500))
      status = await harnessStatus(url)
    }
    if (status === undefined) {
      throw new Error(`[nimpress] modules open: the ${route.system} harness did not answer on ${url}, see ${relative(cwd, log)}`)
    }
  }
  if (status !== 200) {
    throw new Error(
      `[nimpress] modules open: the ${route.system} harness answers ${status} for ${route.component}, restart nimpress dev so it picks the component up`
    )
  }
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
