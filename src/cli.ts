import { loadNimpressConfig } from './config/load'
import { runInit } from './cli/init'
import { runLint } from './cli/lint'
import { runDev, runBuild } from './cli/site'
import { runGuard } from './cli/guard'
import { runModules } from './cli/modules'
import { runExport } from './cli/export'

export { loadNimpressConfig } from './config/load'
export { buildViteConfig } from './config/viteConfig'
export { indexHtml } from './config/html'

export async function run(argv: string[]): Promise<void> {
  const cmd = argv[0] ?? 'dev'
  const args = argv.slice(1)
  const cwd = process.cwd()
  if (cmd === 'init') {
    runInit(cwd)
    return
  }
  const { resolved } = await loadNimpressConfig(cwd)
  if (cmd === 'lint') {
    await runLint(cwd, resolved)
    return
  }
  if (cmd === 'dev') {
    await runDev(cwd, resolved)
    return
  }
  if (cmd === 'build') {
    await runBuild(cwd, resolved)
    return
  }
  if (cmd === 'guard') {
    runGuard(cwd, resolved, args)
    return
  }
  if (cmd === 'modules') {
    await runModules(cwd, resolved, args)
    return
  }
  if (cmd === 'export') {
    runExport(cwd, resolved, args)
    return
  }
  throw new Error(`[nimpress] unknown command: ${cmd}`)
}
