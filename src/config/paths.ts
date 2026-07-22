import { resolve, join } from 'node:path'
import type { ResolvedNimpressConfig } from '../types'

export function outDir(cwd: string, resolved: ResolvedNimpressConfig): string {
  return resolve(cwd, resolved.paths.out)
}

export function cacheDir(cwd: string, resolved: ResolvedNimpressConfig, ...segments: string[]): string {
  return resolve(cwd, resolved.paths.cache, ...segments)
}

export function exportDir(cwd: string, resolved: ResolvedNimpressConfig, override?: string): string {
  return resolve(cwd, override ?? resolved.paths.export)
}

export function modulesRoute(resolved: ResolvedNimpressConfig): string {
  return `/${resolved.paths.modules}`
}

export function guardedRoute(resolved: ResolvedNimpressConfig): string {
  return `/${resolved.paths.guarded}`
}

export function guardedDir(dist: string, resolved: ResolvedNimpressConfig): string {
  return join(dist, resolved.paths.guarded)
}
