import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import type { ControlSpec, ModuleFramework, ResolvedNimpressConfig } from '../types'
import { parseComponentSchema } from './componentData'
import { resolveComponentSource } from './resolve'
import { collectComponentPages } from './pages'
import { readComponentStories } from './stories'

function mockValue(spec: ControlSpec): unknown {
  if (spec.kind === 'select') return spec.options?.[0]
  if (spec.kind === 'boolean') return false
  if (spec.kind === 'number') return 42
  if (spec.kind === 'text') return `Sample ${spec.name}`
  return undefined
}

function detectFramework(componentFile: string): ModuleFramework | null {
  const ext = extname(componentFile)
  if (ext === '.vue') return 'vue'
  if (ext === '.svelte') return 'svelte'
  return null
}

export async function generateAutoStory(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  system: string,
  component: string,
  frameworkFlag?: ModuleFramework
): Promise<string | null> {
  const pages = await collectComponentPages(cwd, resolved.contentDir)
  const page = pages.find((p) => p.system === system && p.component === component)
  if (!page) {
    console.warn(`[nimpress] modules story: no type component page found for ${system}/${component}`)
    return null
  }
  const source = resolveComponentSource(cwd, resolved.modules, system, component, page.file)
  if (!source) {
    console.warn(`[nimpress] modules story: no source found for ${system}/${component}`)
    return null
  }
  const framework = frameworkFlag ?? detectFramework(source.componentFile)
  if (!framework) {
    throw new Error(
      `[nimpress] modules story: failed to detect framework for ${source.componentFile}, pass --framework=vue or --framework=svelte`
    )
  }
  const schema = await parseComponentSchema(source.componentDir, source.componentFile, framework, component)
  const props: Record<string, unknown> = {}
  for (const spec of schema.props) {
    const value = spec.default ?? mockValue(spec)
    if (value !== undefined) props[spec.name] = value
  }
  const slots: Record<string, string> = {}
  for (const spec of schema.slots) {
    slots[spec.name] = `Sample ${spec.name}`
  }
  const helper = framework === 'vue' ? 'vueStory' : 'svelteStory'
  const slotsBlock = Object.keys(slots).length ? `,\n  slots: ${JSON.stringify(slots, null, 2)}` : ''
  const content = `import { ${helper} } from '@nimling/nimpress/story'

// story: Preview
export default ${helper}({
  name: 'Preview',
  props: ${JSON.stringify(props, null, 2)}${slotsBlock}
})
`
  const target = join(dirname(page.pageFile), 'preview.story.ts')
  if (existsSync(target)) {
    console.warn(`[nimpress] modules story: ${target} exists, not overwriting`)
    return null
  }
  await writeFile(target, content)
  return target
}

export async function generateAutoStories(
  cwd: string,
  resolved: ResolvedNimpressConfig,
  system: string
): Promise<number> {
  const pages = await collectComponentPages(cwd, resolved.contentDir)
  let written = 0
  for (const page of pages) {
    if (page.system !== system) continue
    const existing = await readComponentStories(dirname(page.pageFile))
    if (existing.length) continue
    try {
      const target = await generateAutoStory(cwd, resolved, system, page.component)
      if (target) written++
    } catch (err) {
      console.warn(String(err))
    }
  }
  return written
}
