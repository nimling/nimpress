import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const consumer = path.resolve(root, process.env.NIMPRESS_CONSUMER ?? '../docs')
const distDir = path.join(root, 'dist')

let linked = false
try {
  linked = realpathSync(path.join(consumer, 'node_modules/@nimling/nimpress')) === root
} catch {}

process.chdir(consumer)

let builder = null
if (linked) {
  builder = spawn('pnpm', ['exec', 'vite', 'build', '--mode', 'library', '--watch'], {
    cwd: root,
    stdio: 'inherit'
  })
}

const server = await createServer({
  configFile: path.resolve(consumer, 'vite.config.ts'),
  root: consumer,
  ...(linked ? { optimizeDeps: { exclude: ['@nimling/nimpress'] } } : {}),
  server: {
    fs: { allow: [root, consumer] }
  }
})

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
