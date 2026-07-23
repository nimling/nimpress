import { join } from 'node:path'
import { writeFileSync, existsSync, rmSync } from 'node:fs'
import { createServer, build } from 'vite'
import type { ResolvedNimpressConfig } from '../types'
import { buildViteConfig } from '../config/viteConfig'
import { indexHtml } from '../config/html'
import { harnessViteConfig, harnessPort } from '../modules/harness'

export function deployableSystems(resolved: ResolvedNimpressConfig): string[] {
  return Object.entries(resolved.modules.systems)
    .filter(([, systemConfig]) => systemConfig.visibility !== 'dev-only')
    .map(([name]) => name)
}

export async function startHarnessServers(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  systems: string[]
): Promise<void> {
  for (const system of systems) {
    try {
      const server = await createServer(await harnessViteConfig(cwd, resolved, system, 'serve'))
      await server.listen()
      console.log(`nimpress modules: ${system} harness on port ${harnessPort(resolved.modules, system)}`)
    } catch (err) {
      console.warn(`nimpress modules: harness for ${system} failed to start: ${String(err)}`)
    }
  }
}

export async function buildHarnesses(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  systems: string[]
): Promise<void> {
  for (const system of systems) {
    await build(await harnessViteConfig(cwd, resolved, system, 'build'))
    console.log(`nimpress modules: built ${system}`)
  }
}

export async function runDev(cwd: string, resolved: ResolvedNimpressConfig): Promise<void> {
  const server = await createServer(buildViteConfig({ cwd, command: 'serve', resolved }))
  await server.listen()
  await startHarnessServers(cwd, resolved, Object.keys(resolved.modules.systems))
  server.printUrls()
  server.bindCLIShortcuts({ print: true })
}

export async function runBuild(cwd: string, resolved: ResolvedNimpressConfig): Promise<void> {
  const htmlPath = join(cwd, 'index.html')
  const created = !existsSync(htmlPath)
  if (created) writeFileSync(htmlPath, indexHtml(resolved))
  const clean = () => {
    if (created) rmSync(htmlPath, { force: true })
  }
  const onSignal = () => {
    clean()
    process.exit(130)
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)
  try {
    await build(buildViteConfig({ cwd, command: 'build', resolved, htmlInput: htmlPath }))
  } finally {
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
    clean()
  }
  await buildHarnesses(cwd, resolved, deployableSystems(resolved))
}
