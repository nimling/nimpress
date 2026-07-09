import { join, relative, extname, dirname } from 'node:path'
import { writeFileSync, existsSync, readdirSync, rmSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createServer, build, preview } from 'vite'
import { loadNimpressConfig } from './config/load'
import { buildViteConfig } from './config/viteConfig'
import { indexHtml } from './config/html'
import { defaultConfig } from './config/defaults'
import { lintContent } from './plugin'

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
  if (cmd === 'lint') {
    const problems = await lintContent(cwd, resolved.contentDir)
    if (problems.length) {
      console.error(`nimpress lint failed with ${problems.length} problems`)
      for (const p of problems) console.error(`  ${p}`)
      process.exit(1)
    }
    console.log('nimpress lint: frontmatter ok')
    return
  }
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
  if (cmd === 'guard') {
    runGuard(cwd, resolved.outDir, argv.slice(1))
    return
  }
  throw new Error(`[nimpress] unknown command: ${cmd}`)
}

const guardMimes: Record<string, string> = {
  '.json': 'application/json',
  '.xml': 'application/rss+xml',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
}

interface GuardRequirement {
  scope?: string
  claim?: string
}

interface GuardAccess {
  prefix: string
  base?: string
  routes: Record<string, GuardRequirement>
}

function guardFlag(args: string[], name: string): string | undefined {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(full, out)
    else if (entry.isFile()) out.push(full)
  }
  return out
}

function runGuard(cwd: string, outDir: string, args: string[]): void {
  const sub = args[0]
  const dist = join(cwd, guardFlag(args, 'dist') ?? outDir)
  const accessPath = join(dist, 'access.json')
  if (!existsSync(accessPath)) {
    throw new Error(`[nimpress] guard: ${accessPath} not found, run a build first`)
  }
  const access = JSON.parse(readFileSync(accessPath, 'utf-8')) as GuardAccess

  if (sub === 'map') {
    const gatedDir = join(dist, '_gated')
    const files = existsSync(gatedDir) ? walkFiles(gatedDir) : []
    const prefix = access.prefix ?? '/_gated/'
    const entries = files.map((file) => {
      const rel = relative(gatedDir, file).split('\\').join('/')
      const remainder = '/' + rel
      const requirement =
        access.routes[remainder] ?? access.routes[dirname(remainder)] ?? {}
      const data = readFileSync(file)
      return {
        path: `${prefix}${rel}`,
        file: rel,
        sha256: createHash('sha256').update(data).digest('hex'),
        size: statSync(file).size,
        mime: guardMimes[extname(file).toLowerCase()] ?? 'application/octet-stream',
        scope: requirement.scope,
        claim: requirement.claim
      }
    })
    const out = join(cwd, guardFlag(args, 'out') ?? join(dist, 'guard-map.json'))
    writeFileSync(
      out,
      JSON.stringify({ prefix, routes: access.routes, files: entries }, null, 2) + '\n'
    )
    console.log(`nimpress guard: mapped ${entries.length} gated files to ${out}`)
    return
  }

  if (sub === 'apply') {
    const mapPath = guardFlag(args, 'map')
    if (!mapPath) throw new Error('[nimpress] guard apply requires --map=<uploaded mapping json>')
    const uploaded = JSON.parse(readFileSync(join(cwd, mapPath), 'utf-8')) as { base?: string }
    if (!uploaded.base) throw new Error('[nimpress] guard apply: mapping json carries no base url')
    access.base = uploaded.base.replace(/\/$/, '')
    writeFileSync(accessPath, JSON.stringify(access, null, 2) + '\n')
    rmSync(join(dist, '_gated'), { recursive: true, force: true })
    rmSync(join(dist, 'guard-map.json'), { force: true })
    console.log(`nimpress guard: base ${access.base} applied, _gated removed from ${dist}`)
    return
  }

  throw new Error('[nimpress] guard expects map or apply')
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
