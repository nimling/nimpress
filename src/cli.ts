import { join } from 'node:path'
import { writeFileSync, existsSync, readdirSync, rmSync, mkdirSync } from 'node:fs'
import { createServer, build, preview } from 'vite'
import { loadNimpressConfig } from './config/load'
import { buildViteConfig } from './config/viteConfig'
import { indexHtml } from './config/html'
import { defaultConfig } from './config/defaults'

export { loadNimpressConfig } from './config/load'
export { buildViteConfig } from './config/viteConfig'
export { indexHtml } from './config/html'

export async function run(argv: string[]): Promise<void> {
  const cmd = argv[0] ?? 'dev'
  const cwd = process.cwd()
  if (cmd === 'init') {
    runInit(cwd)
    return
  }
  const { resolved } = await loadNimpressConfig(cwd)
  if (cmd === 'dev') {
    const server = await createServer(buildViteConfig({ cwd, command: 'serve', resolved }))
    await server.listen()
    server.printUrls()
    server.bindCLIShortcuts({ print: true })
    return
  }
  if (cmd === 'build') {
    const htmlPath = join(cwd, 'index.html')
    const created = !existsSync(htmlPath)
    if (created) writeFileSync(htmlPath, indexHtml(resolved))
    try {
      await build(buildViteConfig({ cwd, command: 'build', resolved, htmlInput: htmlPath }))
    } finally {
      if (created) rmSync(htmlPath, { force: true })
    }
    return
  }
  if (cmd === 'preview') {
    const server = await preview(buildViteConfig({ cwd, command: 'build', resolved }))
    server.printUrls()
    return
  }
  throw new Error(`[nimpress] unknown command: ${cmd}`)
}

function runInit(cwd: string): void {
  const configPath = join(cwd, 'nimpress.config.json')
  if (!existsSync(configPath)) {
    const seed = {
      title: defaultConfig.title,
      contentDir: defaultConfig.contentDir,
      assetsDir: defaultConfig.assetsDir,
      assetUrlBase: defaultConfig.assetUrlBase,
      outDir: defaultConfig.outDir
    }
    writeFileSync(configPath, JSON.stringify(seed, null, 2) + '\n')
  }
  const contentDir = join(cwd, defaultConfig.contentDir)
  const empty = !existsSync(contentDir) || readdirSync(contentDir).length === 0
  if (empty) {
    mkdirSync(contentDir, { recursive: true })
    writeFileSync(
      join(contentDir, 'index.md'),
      '---\ntitle: Home\n---\n\nWelcome to your Nimpress site.\n'
    )
  }
}
