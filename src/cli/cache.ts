import { existsSync, rmSync } from 'node:fs'
import { loadNimpressConfig } from '../config/load'
import { cacheDir } from '../config/paths'
import { readGlobalConfig, writeGlobalConfig, sitesDir } from './view'
import { hasFlag, positional } from './shared'

export async function runCache(cwd: string, args: string[]): Promise<void> {
  const sub = positional(args, 0)
  if (sub !== 'clear') throw new Error(`[nimpress] cache: unknown subcommand ${sub ?? ''}, use clear`)
  const links = hasFlag(args, 'links')
  const sites = hasFlag(args, 'sites')
  const local = hasFlag(args, 'local')
  const global = !links && !sites && !local
  if (links || global) {
    const config = readGlobalConfig()
    const count = Object.keys(config.links).length
    writeGlobalConfig({ links: {} })
    console.log(`nimpress cache: cleared ${count} links`)
  }
  if (sites || global) {
    const dir = sitesDir()
    rmSync(dir, { recursive: true, force: true })
    console.log(`nimpress cache: cleared the docs site clones under ${dir}`)
  }
  if (local) {
    const { resolved, configFile } = await loadNimpressConfig(cwd)
    if (!configFile) throw new Error(`[nimpress] cache: --local needs a nimpress config in ${cwd}`)
    const dir = cacheDir(cwd, resolved)
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
    console.log(`nimpress cache: cleared ${dir}`)
  }
}
