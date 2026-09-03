import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const config = JSON.parse(await readFile(path.join(root, 'nimpress.config.json'), 'utf8'))
const base = (config.base ?? '/').replace(/\/?$/, '/')
const site = path.join(root, config.paths?.out ?? 'dist')
const port = Number(process.env.PORT ?? 4173)

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
  '.yaml': 'text/yaml; charset=utf-8',
  '.dbml': 'text/plain; charset=utf-8'
}

async function fileAt(candidate) {
  try {
    const info = await stat(candidate)
    return info.isFile() ? candidate : null
  } catch {
    return null
  }
}

async function resolve(pathname) {
  const inner = decodeURIComponent(pathname.slice(base.length))
  const target = path.normalize(path.join(site, inner))
  if (!target.startsWith(site)) return { file: path.join(site, '404.html'), status: 404 }
  const direct = await fileAt(target)
  if (direct) return { file: direct, status: 200 }
  const index = await fileAt(path.join(target, 'index.html'))
  if (index) return { file: index, status: 200 }
  const html = await fileAt(`${target}.html`)
  if (html) return { file: html, status: 200 }
  return { file: path.join(site, '404.html'), status: 404 }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`)
  if (!url.pathname.startsWith(base)) {
    res.writeHead(302, { location: base })
    res.end()
    return
  }
  const { file, status } = await resolve(url.pathname)
  try {
    const body = await readFile(file)
    res.writeHead(status, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('not found')
  }
}).listen(port, () => {
  console.log(`serving ${site} at http://localhost:${port}${base}`)
})
