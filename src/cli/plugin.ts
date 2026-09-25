import { spawnSync } from 'node:child_process'
import { hasFlag } from './shared'

const marketplaceSource = 'nimling/nimpress'

const pluginId = 'nimpress@nimpress'

function claude(cwd: string, args: string[]): void {
  console.log(`claude ${args.join(' ')}`)
  const result = spawnSync('claude', args, { cwd, stdio: 'inherit' })
  if (result.error) throw new Error(`[nimpress] plugin: could not run claude, install Claude Code first: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`[nimpress] plugin: claude ${args.join(' ')} exited with ${result.status}`)
}

export function installPlugin(cwd: string, global: boolean): void {
  const scope = global ? 'user' : 'project'
  claude(cwd, ['plugin', 'marketplace', 'add', marketplaceSource, '--scope', scope])
  claude(cwd, ['plugin', 'install', pluginId, '--scope', scope])
}

export function runPlugin(cwd: string, args: string[]): void {
  if (args[0] === 'put') {
    installPlugin(cwd, !hasFlag(args, 'project'))
    return
  }
  throw new Error('[nimpress] plugin expects put')
}
