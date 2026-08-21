import { createServer, mergeConfig } from 'vite'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { existsSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const consumer = path.resolve(root, process.env.NIMPRESS_CONSUMER ?? '.')
const distDir = path.join(root, 'dist')

if (!existsSync(path.join(distDir, 'cli.es.js'))) {
  console.error('nimpress dev: dist is missing, run just build first')
  process.exit(1)
}

const { loadNimpressConfig, buildViteConfig } = await import(
  path.join(distDir, 'cli.es.js')
)

let linked = consumer === root
if (!linked) {
  try {
    linked = realpathSync(path.join(consumer, 'node_modules/@nimtech/nimpress')) === root
  } catch {}
}

process.chdir(consumer)

let builder = null
if (linked) {
  builder = spawn('pnpm', ['exec', 'vite', 'build', '--mode', 'library', '--watch'], {
    cwd: root,
    stdio: 'inherit'
  })
}

const { resolved } = await loadNimpressConfig(consumer)
const config = mergeConfig(buildViteConfig({ cwd: consumer, command: 'serve', resolved }), {
  ...(linked ? { optimizeDeps: { exclude: ['@nimtech/nimpress'] } } : {}),
  server: { fs: { allow: [root, consumer] } }
})

const server = await createServer(config)

if (linked) {
  server.watcher.add(distDir)
  server.watcher.on('change', (file) => {
    if (file.startsWith(distDir)) server.ws.send({ type: 'full-reload' })
  })
}

await server.listen()
server.printUrls()
server.bindCLIShortcuts({ print: true })

const shutdown = () => {
  if (builder) builder.kill()
  server.close().finally(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
