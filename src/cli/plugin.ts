import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { hasFlag, positional } from './shared'

const marketplaceSource = 'nimling/nimpress'

const pluginId = 'nimpress@nimpress'

interface PackagePlugin {
  name: string
  version: string
  source: string
  target: string
}

function claude(cwd: string, args: string[]): void {
  console.log(`claude ${args.join(' ')}`)
  const result = spawnSync('claude', args, { cwd, stdio: 'inherit' })
  if (result.error) throw new Error(`[nimpress] plugin: could not run claude, install Claude Code first: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`[nimpress] plugin: claude ${args.join(' ')} exited with ${result.status}`)
}

function claudeList<T>(cwd: string, args: string[]): T[] {
  const result = spawnSync('claude', args, { cwd, encoding: 'utf-8' })
  if (result.error || result.status !== 0) return []
  try {
    const parsed = JSON.parse(result.stdout)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function packageDir(cwd: string, name: string): string {
  let dir = cwd
  for (;;) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate)
    const parent = dirname(dir)
    if (parent === dir) throw new Error(`[nimpress] plugin: ${name} is not installed in node_modules at or above ${cwd}`)
    dir = parent
  }
}

function pluginFiles(root: string, dir = ''): string[] {
  const files: string[] = []
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = dir ? `${dir}/${entry.name}` : entry.name
    if (path === '.claude-plugin') continue
    if (entry.isDirectory()) files.push(...pluginFiles(root, path))
    else files.push(path)
  }
  return files.sort()
}

function packagePlugin(cwd: string, name: string): PackagePlugin {
  const dir = packageDir(cwd, name)
  const source = join(dir, 'plugin')
  const manifestPath = join(source, '.claude-plugin', 'plugin.json')
  if (!existsSync(manifestPath) || !existsSync(join(source, '.claude-plugin', 'marketplace.json'))) {
    throw new Error(`[nimpress] plugin: ${name} ships no Claude plugin, expected plugin/.claude-plugin/plugin.json and marketplace.json in the package`)
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { name?: string }
  if (!manifest.name || !/^[a-z0-9][a-z0-9-]*$/.test(manifest.name)) throw new Error(`[nimpress] plugin: ${manifestPath} needs a name of lowercase letters, digits and hyphens`)
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')) as { version: string }
  const hash = createHash('sha256')
  for (const file of pluginFiles(source)) {
    hash.update(file)
    hash.update(readFileSync(join(source, file)))
  }
  return {
    name: manifest.name,
    version: `v${pkg.version}-${hash.digest('hex').slice(0, 12)}`,
    source,
    target: join(homedir(), `.${manifest.name}`, 'plugin')
  }
}

function installedVersion(plugin: PackagePlugin): string {
  const path = join(plugin.target, '.claude-plugin', 'plugin.json')
  if (!existsSync(path)) return ''
  return (JSON.parse(readFileSync(path, 'utf-8')) as { version?: string }).version ?? ''
}

function checkPackagePlugin(plugin: PackagePlugin, packageName: string): void {
  const have = installedVersion(plugin)
  if (have !== plugin.version) {
    throw new Error(`[nimpress] plugin: the installed ${plugin.name} plugin is ${have || 'missing'}, the package carries ${plugin.version}, run nimpress plugin put ${packageName}`)
  }
  console.log(`installed ${have}`)
}

function installPackagePlugin(cwd: string, plugin: PackagePlugin, global: boolean): void {
  const scope = global ? 'user' : 'project'
  const id = `${plugin.name}@${plugin.name}`
  rmSync(plugin.target, { recursive: true, force: true })
  mkdirSync(plugin.target, { recursive: true })
  cpSync(plugin.source, plugin.target, { recursive: true })
  const manifestPath = join(plugin.target, '.claude-plugin', 'plugin.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, version: plugin.version }, null, 2)}\n`)
  const marketplacePath = join(plugin.target, '.claude-plugin', 'marketplace.json')
  const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf-8')) as { plugins?: Record<string, unknown>[] }
  const plugins = (marketplace.plugins ?? []).map((entry) => ({ ...entry, version: plugin.version }))
  writeFileSync(marketplacePath, `${JSON.stringify({ ...marketplace, plugins }, null, 2)}\n`)
  console.log(`wrote ${plugin.target} version ${plugin.version}`)

  const known = claudeList<{ name: string }>(cwd, ['plugin', 'marketplace', 'list', '--json']).some((entry) => entry.name === plugin.name)
  claude(cwd, known ? ['plugin', 'marketplace', 'update', plugin.name] : ['plugin', 'marketplace', 'add', plugin.target, '--scope', scope])
  const installed = claudeList<{ id: string; scope: string }>(cwd, ['plugin', 'list', '--json']).some((entry) => entry.id === id && entry.scope === scope)
  claude(cwd, ['plugin', installed ? 'update' : 'install', id, '--scope', scope])
}

export function installPlugin(cwd: string, global: boolean): void {
  const scope = global ? 'user' : 'project'
  claude(cwd, ['plugin', 'marketplace', 'add', marketplaceSource, '--scope', scope])
  claude(cwd, ['plugin', 'install', pluginId, '--scope', scope])
}

export function runPlugin(cwd: string, args: string[]): void {
  if (args[0] === 'put') {
    const packageName = positional(args, 1)
    const check = hasFlag(args, 'check')
    if (!packageName) {
      if (check) throw new Error('[nimpress] plugin put --check expects a package, the nimpress plugin is checked by claude plugin list')
      installPlugin(cwd, !hasFlag(args, 'project'))
      return
    }
    const plugin = packagePlugin(cwd, packageName)
    if (check) checkPackagePlugin(plugin, packageName)
    else installPackagePlugin(cwd, plugin, !hasFlag(args, 'project'))
    return
  }
  throw new Error('[nimpress] plugin expects put')
}
