import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadConfigFromFile } from 'vite'
import type { NimpressUserConfig, ResolvedNimpressConfig } from '../types'
import { defaultConfig } from './defaults'
import { parseUserConfig } from './schema'

const candidates = ['nimpress.config.ts', 'nimpress.config.js', 'nimpress.config.mjs', 'nimpress.config.json']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeDeep<T>(base: T, override: Partial<T> | undefined): T {
  if (!override) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    if (value === undefined) continue
    const current = out[key]
    if (isPlainObject(current) && isPlainObject(value)) {
      out[key] = mergeDeep(current, value)
    } else {
      out[key] = value
    }
  }
  return out as T
}

async function readConfigFile(cwd: string): Promise<{ config: NimpressUserConfig; file: string } | null> {
  for (const name of candidates) {
    const file = resolve(cwd, name)
    if (!existsSync(file)) continue
    if (name.endsWith('.json')) {
      const raw = JSON.parse(readFileSync(file, 'utf-8'))
      return { config: parseUserConfig(raw, file), file }
    }
    const loaded = await loadConfigFromFile({ command: 'serve', mode: 'development' }, file, cwd)
    const exported = (loaded?.config ?? {}) as unknown
    return { config: parseUserConfig(exported, file), file }
  }
  return null
}

export async function loadNimpressConfig(
  cwd: string,
  inline?: Partial<NimpressUserConfig>
): Promise<{ resolved: ResolvedNimpressConfig; configFile: string | null }> {
  const found = await readConfigFile(cwd)
  const foundConfig = found?.config ? { ...found.config, modules: undefined } : undefined
  const inlineConfig = inline ? { ...inline, modules: undefined } : undefined
  let resolved = mergeDeep(defaultConfig, foundConfig as Partial<ResolvedNimpressConfig> | undefined)
  resolved = mergeDeep(resolved, inlineConfig as Partial<ResolvedNimpressConfig> | undefined)
  resolved.css = typeof resolved.css === 'string' ? [resolved.css] : resolved.css ?? []
  const userModules = inline?.modules ?? found?.config?.modules
  resolved.modules = {
    dir: defaultConfig.modules.dir,
    route: defaultConfig.modules.route,
    systems: userModules ? Object.fromEntries(userModules.map((s) => [s.name, s])) : {}
  }
  return { resolved, configFile: found?.file ?? null }
}

export function runtimeConfig(resolved: ResolvedNimpressConfig) {
  return {
    title: resolved.title,
    logo: resolved.logo,
    github: resolved.github,
    brand: resolved.brand,
    contentRoot: resolved.contentDir,
    navRoutes: resolved.navRoutes,
    auth: resolved.auth,
    subscribe: resolved.subscribe,
    site: resolved.site,
    footer: resolved.footer
  }
}
