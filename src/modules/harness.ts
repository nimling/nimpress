import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readdirSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve, isAbsolute } from 'node:path'
import type { InlineConfig, PluginOption } from 'vite'
import type { ModuleFramework, ModuleSystemConfig, ModulesConfig, ResolvedNimpressConfig } from '../types'
import { mergeDeep } from '../config/viteConfig'
import { resolveComponentSource } from './resolve'
import type { ComponentPageRef } from './pages'
import { collectComponentPages } from './pages'

export const HARNESS_BASE_PORT = 6161

export function harnessPort(modules: ModulesConfig, system: string): number {
  const configured = modules.systems[system]?.port
  if (configured) return configured
  const names = Object.keys(modules.systems).sort()
  return HARNESS_BASE_PORT + Math.max(0, names.indexOf(system))
}

export function harnessTempDir(cwd: string, system: string): string {
  return join(cwd, '.nimpress', 'modules', system)
}

function messageBridge(): string {
  return `const params = new URLSearchParams(location.search)
function parseParam(name) {
  const raw = params.get(name)
  if (!raw) return undefined
  try { return JSON.parse(decodeURIComponent(escape(atob(raw)))) } catch { return undefined }
}
const state = {
  props: parseParam('props') ?? {},
  slots: parseParam('slots') ?? {},
  emits: parseParam('emits') ?? []
}
function applyTheme(mode) {
  if (mode !== 'light' && mode !== 'dark') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode
}
applyTheme(params.get('theme'))
function safeArgs(args) {
  try { return JSON.parse(JSON.stringify(args)) } catch { return [] }
}
function emitOut(name, args) {
  parent.postMessage({ type: 'nimpress:emit', name, args: safeArgs(args) }, '*')
}
window.addEventListener('message', (event) => {
  const d = event.data
  if (!d || d.type !== 'nimpress:props') return
  if (d.props !== undefined) state.props = d.props
  if (d.slots !== undefined) state.slots = d.slots
  if (d.emits !== undefined) state.emits = d.emits
  if (d.theme !== undefined) applyTheme(d.theme)
  render()
})
window.addEventListener('wheel', (event) => {
  if (!event.ctrlKey) return
  event.preventDefault()
  parent.postMessage({ type: 'nimpress:zoom', delta: event.deltaY }, '*')
}, { passive: false })
let gestureBase = 1
window.addEventListener('gesturestart', (event) => {
  event.preventDefault()
  gestureBase = event.scale ?? 1
})
window.addEventListener('gesturechange', (event) => {
  event.preventDefault()
  const scale = event.scale ?? 1
  parent.postMessage({ type: 'nimpress:zoomscale', scale: scale / gestureBase }, '*')
  gestureBase = scale
})`
}

function componentLoader(target: HarnessTarget): string {
  const pick = target.named ? `mod[${JSON.stringify(target.component)}]` : 'mod.default ?? mod'
  return `let ComponentRef = null
async function ensureComponent() {
  if (!ComponentRef) {
    const mod = await import(${JSON.stringify(target.importSpec)})
    ComponentRef = ${pick}
  }
  return ComponentRef
}`
}

function storyRegistry(target: HarnessTarget): string {
  const entries = (target.storyFiles ?? [])
    .map((file) => `  ${JSON.stringify(file.base)}: () => import(${JSON.stringify(file.path)})`)
    .join(',\n')
  return `const storyLoaders = {
${entries}
}
const activeLoader = storyLoaders[params.get('story') ?? '']
const activeStoryDef = activeLoader ? (await activeLoader()).default : null`
}

function vueEntry(target: HarnessTarget, css: string[]): string {
  const cssImports = css.map((c) => `import ${JSON.stringify(c)}`).join('\n')
  return `import { createApp, h } from 'vue'
${cssImports}

${messageBridge()}
${storyRegistry(target)}
${componentLoader(target)}

let app = null
async function render() {
  try {
    if (app) app.unmount()
    if (activeStoryDef && typeof activeStoryDef.render === 'function') {
      app = createApp(activeStoryDef.render())
      app.mount('#host')
      return
    }
    const Component = await ensureComponent()
    const props = { ...state.props }
    for (const name of state.emits) {
      const key = 'on' + name.replace(/[:.-](\\w)/g, (_, c) => c.toUpperCase()).replace(/^\\w/, (c) => c.toUpperCase())
      props[key] = (...args) => emitOut(name, args)
    }
    const slots = {}
    for (const [name, html] of Object.entries(state.slots)) {
      slots[name] = () => h('span', { innerHTML: String(html) })
    }
    app = createApp({ render: () => h(Component, props, slots) })
    app.mount('#host')
  } catch (err) {
    console.error(err)
    document.getElementById('host').innerText = String(err)
    parent.postMessage({ type: 'nimpress:error', message: String(err) }, '*')
  }
}
await render()
parent.postMessage({ type: 'nimpress:ready' }, '*')
`
}

function svelteEntry(target: HarnessTarget, css: string[]): string {
  const cssImports = css.map((c) => `import ${JSON.stringify(c)}`).join('\n')
  return `import { mount, unmount, createRawSnippet } from 'svelte'
${cssImports}

${messageBridge()}
${storyRegistry(target)}
${componentLoader(target)}

let instance = null
async function render() {
  try {
    if (instance) unmount(instance)
    const props = { ...state.props }
    for (const name of state.emits) {
      props[name] = (...args) => emitOut(name, args)
    }
    for (const [name, html] of Object.entries(state.slots)) {
      props[name] = createRawSnippet(() => ({ render: () => '<span>' + String(html) + '</span>' }))
    }
    const override = activeStoryDef && activeStoryDef.component ? activeStoryDef.component : await ensureComponent()
    instance = mount(override, { target: document.getElementById('host'), props })
  } catch (err) {
    console.error(err)
    document.getElementById('host').innerText = String(err)
    parent.postMessage({ type: 'nimpress:error', message: String(err) }, '*')
  }
}
await render()
parent.postMessage({ type: 'nimpress:ready' }, '*')
`
}

export function harnessEntrySource(framework: ModuleFramework, target: HarnessTarget, css: string[]): string {
  return framework === 'vue' ? vueEntry(target, css) : svelteEntry(target, css)
}

export function harnessHtml(component: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${component}</title>
    <style>
      html, body { margin: 0; padding: 0; background: transparent; height: 100%; }
      body { color: #18181b; }
      html.dark body { color: #e4e4e7; }
      #host { display: flow-root; min-height: 100%; box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div id="host"></div>
    <script type="module" src="./entry.ts"></script>
  </body>
</html>
`
}

export async function loadFrameworkPlugin(cwd: string, framework: ModuleFramework): Promise<PluginOption> {
  if (framework === 'svelte') {
    const { svelte } = await import('@sveltejs/vite-plugin-svelte')
    return svelte()
  }
  const req = createRequire(join(cwd, 'package.json'))
  let resolvedPath: string
  try {
    resolvedPath = req.resolve('@vitejs/plugin-vue')
  } catch {
    throw new Error('[nimpress] modules system with framework vue requires @vitejs/plugin-vue installed in the consumer')
  }
  const mod = await import(pathToFileURL(resolvedPath).href)
  const vue = (mod.default ?? mod) as () => PluginOption
  return vue()
}

export interface HarnessTarget {
  component: string
  importSpec: string
  named?: boolean
  storyFiles?: Array<{ base: string; path: string }>
}

export function resolveHarnessTargets(
  cwd: string,
  modules: ModulesConfig,
  system: string,
  pages: ComponentPageRef[]
): HarnessTarget[] {
  const systemConfig = modules.systems[system]
  if (!systemConfig) return []
  const targets: HarnessTarget[] = []
  for (const page of pages) {
    if (page.system !== system) continue
    const storyFiles = collectStoryFiles(page.pageFile)
    const source = systemConfig.source
      ? resolveComponentSource(cwd, modules, system, page.component, page.file)
      : null
    if (source) {
      targets.push({ component: page.component, importSpec: source.componentFile, storyFiles })
      continue
    }
    const pkg = page.package ?? systemConfig.package
    if (pkg) {
      targets.push({ component: page.component, importSpec: pkg, named: true, storyFiles })
      continue
    }
    console.warn(`[nimpress] modules: no source found for ${system}/${page.component}`)
  }
  return targets
}

function collectStoryFiles(pageFile: string): Array<{ base: string; path: string }> {
  const dir = dirname(pageFile)
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  return entries
    .filter((name) => name.endsWith('.story.ts'))
    .sort()
    .map((name) => ({ base: basename(name, '.story.ts'), path: join(dir, name) }))
}

export async function writeHarnessFiles(
  cwd: string,
  systemConfig: ModuleSystemConfig,
  system: string,
  targets: HarnessTarget[]
): Promise<string> {
  const root = harnessTempDir(cwd, system)
  await rm(root, { recursive: true, force: true })
  await mkdir(root, { recursive: true })
  const css = (systemConfig.css ?? []).map((c) =>
    c.startsWith('.') || isAbsolute(c) ? resolve(cwd, c) : c
  )
  for (const target of targets) {
    const dir = join(root, target.component)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.html'), harnessHtml(target.component))
    await writeFile(join(dir, 'entry.ts'), harnessEntrySource(systemConfig.framework, target, css))
  }
  return root
}

export async function harnessViteConfig(
  cwd: string,
  resolvedConfig: ResolvedNimpressConfig,
  system: string,
  command: 'serve' | 'build'
): Promise<InlineConfig> {
  const modules = resolvedConfig.modules
  const systemConfig = modules.systems[system]
  if (!systemConfig) throw new Error(`[nimpress] unknown module system: ${system}`)
  const pages = await collectComponentPages(cwd, resolvedConfig.contentDir)
  const targets = resolveHarnessTargets(cwd, modules, system, pages)
  if (!targets.length) {
    console.warn(`[nimpress] modules: no component pages found for system ${system}`)
  }
  const root = await writeHarnessFiles(cwd, systemConfig, system, targets)
  const framework = await loadFrameworkPlugin(cwd, systemConfig.framework)
  const sourceRoot = systemConfig.source ? resolve(cwd, systemConfig.source) : cwd
  const routeBase = modules.route.replace(/\/$/, '')
  const config: InlineConfig = {
    root,
    configFile: false,
    publicDir: false,
    appType: 'mpa',
    cacheDir: join(cwd, 'node_modules', '.vite-nimpress', system),
    plugins: [framework],
    resolve: systemConfig.framework === 'vue' ? { alias: { vue: 'vue/dist/vue.esm-bundler.js' } } : undefined,
    server: {
      host: '127.0.0.1',
      port: harnessPort(modules, system),
      strictPort: true,
      fs: { allow: [cwd, sourceRoot] },
      hmr: {
        host: '127.0.0.1',
        clientPort: harnessPort(modules, system)
      }
    },
    build: {
      outDir: resolve(cwd, resolvedConfig.outDir, routeBase.replace(/^\//, ''), system),
      emptyOutDir: true,
      target: 'es2022',
      rollupOptions: {
        input: Object.fromEntries(targets.map((t) => [t.component, join(root, t.component, 'index.html')]))
      }
    },
    base: `${routeBase}/${system}/`
  }
  return mergeDeep(config, resolvedConfig.vite as Partial<InlineConfig>)
}
