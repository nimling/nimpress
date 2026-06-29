import { resolve } from 'node:path'
import type { InlineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import type { ResolvedNimpressConfig } from '../types'
import nimpress from '../plugin'

function mergeDeep<T>(base: T, override: Partial<T> | undefined): T {
  if (!override) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    if (value === undefined) continue
    const current = out[key]
    const isObj = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null && !Array.isArray(v)
    if (isObj(current) && isObj(value)) out[key] = mergeDeep(current, value)
    else out[key] = value
  }
  return out as T
}

export interface BuildViteOptions {
  cwd: string
  command: 'serve' | 'build'
  resolved: ResolvedNimpressConfig
  htmlInput?: string
}

export function buildViteConfig(opts: BuildViteOptions): InlineConfig {
  const { cwd, command, resolved, htmlInput } = opts
  const base: InlineConfig = {
    root: cwd,
    configFile: false,
    publicDir: false,
    appType: 'custom',
    plugins: [
      svelte({ compilerOptions: { runes: true, dev: command === 'serve' } }),
      tailwindcss(),
      nimpress(resolved)
    ],
    build: {
      outDir: resolve(cwd, resolved.outDir),
      emptyOutDir: true,
      target: 'es2022',
      ...(htmlInput ? { rollupOptions: { input: htmlInput } } : {})
    }
  }
  return mergeDeep(base, resolved.vite as Partial<InlineConfig>)
}
