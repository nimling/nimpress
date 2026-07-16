import { join, relative, extname, dirname } from 'node:path'
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

interface GuardRequirement {
  scope?: string
  claim?: string
}

interface GuardAccess {
  prefix: string
  base?: string
  routes: Record<string, GuardRequirement>
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
    const gatedDir = join(dist, '_gated')
    const files = existsSync(gatedDir) ? walkFiles(gatedDir) : []
    const prefix = access.prefix ?? '/_gated/'
    const entries = files.map((file) => {
      const rel = relative(gatedDir, file).split('\\').join('/')
      const remainder = '/' + rel
      const requirement = access.routes[remainder] ?? access.routes[dirname(remainder)] ?? {}
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
    const outFlag = flag(args, 'out')
    const out = outFlag ? join(cwd, outFlag) : join(dist, 'guard-map.json')
    writeFileSync(out, JSON.stringify({ prefix, routes: access.routes, files: entries }, null, 2) + '\n')
    console.log(`nimpress guard: mapped ${entries.length} gated files to ${out}`)
    return
  }

  if (sub === 'apply') {
    const mapPath = flag(args, 'map')
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
