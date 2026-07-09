import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import type { ComponentPageData, ModulesConfig } from '../types'
import { parseVueComponent } from './parse/vue'
import { parseSvelteComponent } from './parse/svelte'
import { findComponentDts, parseDtsSchema } from './parse/dts'
import { readComponentStories } from './stories'
import { resolveComponentSource } from './resolve'

export interface BuiltComponentData {
  data: ComponentPageData
  watchFiles: string[]
}

export async function buildComponentPageData(opts: {
  cwd: string
  modules: ModulesConfig
  pageFile: string
  data: Record<string, unknown>
  editable: boolean
}): Promise<BuiltComponentData> {
  const { cwd, modules, pageFile, data, editable } = opts
  const system = String(data.system ?? '')
  const component = String(data.component ?? '')
  const fileOverride = typeof data.file === 'string' ? data.file : undefined
  const stories = await readComponentStories(dirname(pageFile))
  const source = resolveComponentSource(cwd, modules, system, component, fileOverride)
  const watchFiles: string[] = []

  let schema
  let claudeMd: string | undefined
  let claudeMdPath: string | undefined
  if (source) {
    const text = await readFile(source.componentFile, 'utf-8')
    schema = source.systemConfig.framework === 'vue'
      ? parseVueComponent(text, component)
      : parseSvelteComponent(text, component)
    watchFiles.push(source.componentFile)
    if (existsSync(source.claudeMdPath)) {
      claudeMd = await readFile(source.claudeMdPath, 'utf-8')
      claudeMdPath = relative(cwd, source.claudeMdPath)
      watchFiles.push(source.claudeMdPath)
    }
  } else {
    const pkg = typeof data.package === 'string' ? data.package : modules.systems[system]?.package
    if (pkg) {
      const dtsPath = findComponentDts(cwd, pkg, component)
      if (dtsPath) {
        schema = parseDtsSchema(await readFile(dtsPath, 'utf-8'), component)
        const packagedClaude = dtsPath.replace(/[^/]+$/, 'CLAUDE.md')
        if (existsSync(packagedClaude)) {
          claudeMd = await readFile(packagedClaude, 'utf-8')
        }
      }
    }
  }

  const route = modules.route.replace(/\/$/, '')
  return {
    data: {
      system,
      component,
      package: typeof data.package === 'string' ? data.package : undefined,
      version: typeof data.version === 'string' ? data.version : undefined,
      claudeMd,
      claudeMdPath,
      editable: editable && !!source,
      harnessPath: `${route}/${encodeURIComponent(system)}/${encodeURIComponent(component)}`,
      schema,
      stories
    },
    watchFiles
  }
}
