import type { InlineConfig } from 'vite'
import type { ResolvedNimpressConfig } from '../types'
import { cacheDir, outDir } from './paths'
import { chunkCycleGuard } from './chunkCycles'
import nimpress from '../plugin'

export function mergeDeep<T>(base: T, override: Partial<T> | undefined): T {
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

export async function buildViteConfig(opts: BuildViteOptions): Promise<InlineConfig> {
  const { cwd, command, resolved, htmlInput } = opts
  const { svelte } = await import('@sveltejs/vite-plugin-svelte')
  const { default: tailwindcss } = await import('@tailwindcss/vite')
  const base: InlineConfig = {
    root: cwd,
    base: resolved.base,
    configFile: false,
    publicDir: false,
    appType: 'custom',
    plugins: [
      svelte({ compilerOptions: { runes: true, dev: command === 'serve' } }),
      tailwindcss(),
      nimpress({ ...resolved, modules: Object.values(resolved.modules.systems) }),
      chunkCycleGuard()
    ],
    cacheDir: cacheDir(cwd, resolved, 'site'),
    build: {
      outDir: outDir(cwd, resolved),
      emptyOutDir: true,
      target: 'es2022',
      ...(htmlInput ? { rollupOptions: { input: htmlInput } } : {})
    }
  }
  return mergeDeep(base, resolved.vite as Partial<InlineConfig>)
}
