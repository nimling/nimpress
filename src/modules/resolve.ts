import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { ModulesConfig, ModuleSystemConfig } from '../types'

export interface ResolvedComponentSource {
  systemConfig: ModuleSystemConfig
  componentFile: string
  componentDir: string
  claudeMdPath: string
}

export function resolveComponentSource(
  cwd: string,
  modules: ModulesConfig,
  system: string,
  component: string,
  fileOverride?: string
): ResolvedComponentSource | null {
  const systemConfig = modules.systems[system]
  if (!systemConfig?.source) return null
  const root = resolve(cwd, systemConfig.source)
  const ext = systemConfig.framework === 'vue' ? '.vue' : '.svelte'
  const candidates = fileOverride
    ? [resolve(root, fileOverride)]
    : [join(root, component, component + ext), join(root, component + ext)]
  for (const file of candidates) {
    if (!fileOverride && !file.startsWith(root)) continue
    if (!existsSync(file)) continue
    const componentDir = dirname(file)
    return {
      systemConfig,
      componentFile: file,
      componentDir,
      claudeMdPath: join(componentDir, 'CLAUDE.md')
    }
  }
  return null
}
