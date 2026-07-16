import { join, relative, extname } from 'node:path'
import { writeFileSync, existsSync, rmSync, readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { ResolvedNimpressConfig } from '../types'
import { flag, walkFiles } from './shared'

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

interface GuardedRoute {
  gate?: string
  bundle: string
}

interface GuardAccess {
  prefix: string
  base?: string
  routes: Record<string, GuardedRoute>
}

interface GuardMap {
  prefix: string
  routes: Record<string, GuardedRoute>
  bundles: Record<string, { pages: Record<string, string>; files: string[] }>
}

export function runGuard(cwd: string, resolved: ResolvedNimpressConfig, args: string[]): void {
  const sub = args[0]
  const dist = join(cwd, flag(args, 'dist') ?? resolved.outDir)
  const accessPath = join(dist, 'access.json')
  if (!existsSync(accessPath)) {
    throw new Error(`[nimpress] guard: ${accessPath} not found, run a build first`)
  }
  const access = JSON.parse(readFileSync(accessPath, 'utf-8')) as GuardAccess

  if (sub === 'map') {
    const guardedDir = join(dist, '_guarded')
    const mapPath = join(dist, 'guard.map.json')
    const built: GuardMap = existsSync(mapPath)
      ? (JSON.parse(readFileSync(mapPath, 'utf-8')) as GuardMap)
      : { prefix: access.prefix ?? '/_guarded/', routes: access.routes, bundles: {} }
    const files = existsSync(guardedDir) ? walkFiles(guardedDir) : []
    const prefix = built.prefix ?? '/_guarded/'
    const entries = files.map((file) => {
      const rel = relative(guardedDir, file).split('\\').join('/')
      const bundle = rel.split('/')[0] ?? ''
      const gates = [
        ...new Set(
          Object.values(built.routes ?? {})
            .filter((r) => r.bundle === bundle && r.gate)
            .map((r) => r.gate as string)
        )
      ]
      const data = readFileSync(file)
      return {
        path: `${prefix}${rel}`,
        file: rel,
        bundle,
        sha256: createHash('sha256').update(data).digest('hex'),
        size: statSync(file).size,
        mime: guardMimes[extname(file).toLowerCase()] ?? 'application/octet-stream',
        gates
      }
    })
    const outFlag = flag(args, 'out')
    const out = outFlag ? join(cwd, outFlag) : mapPath
    writeFileSync(
      out,
      JSON.stringify({ ...built, prefix, files: entries }, null, 2) + '\n'
    )
    console.log(`nimpress guard: mapped ${entries.length} guarded files to ${out}`)
    return
  }

  if (sub === 'apply') {
    const mapPath = flag(args, 'map')
    if (!mapPath) throw new Error('[nimpress] guard apply requires --map=<uploaded mapping json>')
    const uploaded = JSON.parse(readFileSync(join(cwd, mapPath), 'utf-8')) as { base?: string }
    if (!uploaded.base) throw new Error('[nimpress] guard apply: mapping json carries no base url')
    access.base = uploaded.base.replace(/\/$/, '')
    writeFileSync(accessPath, JSON.stringify(access, null, 2) + '\n')
    rmSync(join(dist, '_guarded'), { recursive: true, force: true })
    rmSync(join(dist, 'guard.map.json'), { force: true })
    console.log(`nimpress guard: base ${access.base} applied, _guarded removed from ${dist}`)
    return
  }

  throw new Error('[nimpress] guard expects map or apply')
}
