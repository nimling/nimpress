import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { existsSync, readdirSync } from 'node:fs'
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
  const host = document.getElementById('host')
  if (host) host.style.colorScheme = mode
}
applyTheme(params.get('theme'))
let shadowStyle = null
function applyShadow(on) {
  if (on && !shadowStyle) {
    shadowStyle = document.createElement('style')
    shadowStyle.textContent = '#host > * { box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25); } [data-theme="dark"] #host > * { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.09); }'
    document.head.appendChild(shadowStyle)
  } else if (!on && shadowStyle) {
    shadowStyle.remove()
    shadowStyle = null
  }
}
applyShadow(params.get('shadow') === '1')
function safeArgs(args) {
  try { return JSON.parse(JSON.stringify(args)) } catch { return [] }
}
function evalOut(value) {
  if (value === undefined) return 'undefined'
  try { return JSON.parse(JSON.stringify(value)) } catch { return String(value) }
}
function runEval(code) {
  parent.postMessage({ type: 'nimpress:console', level: 'input', args: [code] }, '*')
  try {
    const result = (0, eval)(code)
    Promise.resolve(result).then(
      (value) => parent.postMessage({ type: 'nimpress:console', level: 'result', args: [evalOut(value)] }, '*'),
      (err) => parent.postMessage({ type: 'nimpress:console', level: 'error', args: [String(err)] }, '*')
    )
  } catch (err) {
    parent.postMessage({ type: 'nimpress:console', level: 'error', args: [String(err)] }, '*')
  }
}
function emitOut(name, args) {
  parent.postMessage({ type: 'nimpress:emit', name, args: safeArgs(args) }, '*')
}
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  const original = console[level].bind(console)
  console[level] = (...args) => {
    original(...args)
    parent.postMessage({ type: 'nimpress:console', level, args: safeArgs(args) }, '*')
  }
}
window.addEventListener('error', (event) => {
  parent.postMessage({ type: 'nimpress:console', level: 'error', args: [String(event.message)] }, '*')
})
window.addEventListener('unhandledrejection', (event) => {
  parent.postMessage({ type: 'nimpress:console', level: 'error', args: ['unhandled rejection: ' + String(event.reason)] }, '*')
})
function emitEntries(emits) {
  if (Array.isArray(emits)) return emits.map((name) => [name, null])
  if (emits && typeof emits === 'object') return Object.entries(emits)
  return []
}
function bindEmit(name, source) {
  let user = null
  if (source) {
    try {
      user = new Function('return (' + source + ')')()
    } catch (err) {
      console.error('handler ' + name + ' failed to compile', err)
    }
  }
  return (...args) => {
    emitOut(name, args)
    if (user) {
      try {
        user(...args)
      } catch (err) {
        console.error('handler ' + name + ' threw', err)
      }
    }
  }
}
function materializeFns(props, path) {
  for (const [key, value] of Object.entries(props)) {
    const label = path ? path + '.' + key : key
    if (value && typeof value === 'object' && typeof value.__nimpressFn === 'string') {
      let fn
      try {
        fn = new Function('return (' + value.__nimpressFn + ')')()
      } catch (err) {
        console.error('nimpress fn ' + label + ' failed to compile', err)
        continue
      }
      props[key] = (...args) => {
        emitOut(label, args)
        return fn(...args)
      }
    } else if (value && typeof value === 'object') {
      materializeFns(value, label)
    }
  }
  return props
}
window.addEventListener('message', (event) => {
  const d = event.data
  if (!d) return
  if (d.type === 'nimpress:eval') {
    runEval(String(d.code ?? ''))
    return
  }
  if (d.type !== 'nimpress:props') return
  if (d.props !== undefined) state.props = d.props
  if (d.slots !== undefined) state.slots = d.slots
  if (d.emits !== undefined) state.emits = d.emits
  if (d.theme !== undefined) applyTheme(d.theme)
  if (d.shadow !== undefined) applyShadow(!!d.shadow)
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

function setupImport(setup: string | undefined): string {
  return setup ? `import harnessSetup from ${JSON.stringify(setup)}` : 'const harnessSetup = null'
}

export interface VueBaseline {
  primevue: boolean
  confirmation: boolean
  overlay?: string
}

export function detectVueBaseline(cwd: string, systemConfig: ModuleSystemConfig): VueBaseline {
  const req = createRequire(join(cwd, 'package.json'))
  const has = (spec: string) => {
    try {
      req.resolve(spec)
      return true
    } catch {
      return false
    }
  }
  let overlay: string | undefined
  if (systemConfig.source) {
    const root = resolve(cwd, systemConfig.source)
    overlay = [join(root, 'ModalsRoot', 'ModalsRoot.vue'), join(root, 'ModalsRoot.vue')].find((f) => existsSync(f))
  }
  return { primevue: has('primevue/config'), confirmation: has('primevue/confirmationservice'), overlay }
}

function vueEntry(target: HarnessTarget, css: string[], setup: string | undefined, baseline: VueBaseline): string {
  const cssImports = css.map((c) => `import ${JSON.stringify(c)}`).join('\n')
  const baselineImports = [
    baseline.primevue ? `import PrimeVue from 'primevue/config'` : 'const PrimeVue = null',
    baseline.confirmation ? `import ConfirmationService from 'primevue/confirmationservice'` : 'const ConfirmationService = null',
    baseline.overlay ? `import OverlayRoot from ${JSON.stringify(baseline.overlay)}` : 'const OverlayRoot = null'
  ].join('\n')
  return `import { createApp, h } from 'vue'
${cssImports}
${setupImport(setup)}
${baselineImports}

${messageBridge()}
${storyRegistry(target)}
${componentLoader(target)}

const setupDef = typeof harnessSetup === 'function' ? await harnessSetup() : harnessSetup
const Companion = setupDef ? (setupDef.companion ?? null) : OverlayRoot

function installBaseline(app) {
  if (setupDef && typeof setupDef.install === 'function') {
    setupDef.install(app)
    return
  }
  if (PrimeVue) app.use(PrimeVue, { ripple: true, theme: 'none' })
  if (ConfirmationService) app.use(ConfirmationService)
}

function mountApp(root) {
  const app = createApp({ render: () => (Companion ? [h(root), h(Companion)] : h(root)) })
  installBaseline(app)
  app.mount('#host')
  return app
}

let app = null
async function render() {
  try {
    if (app) app.unmount()
    if (activeStoryDef && typeof activeStoryDef.render === 'function') {
      app = mountApp(activeStoryDef.render())
      return
    }
    const Component = await ensureComponent()
    const props = materializeFns(structuredClone(state.props))
    for (const [name, source] of emitEntries(state.emits)) {
      const key = 'on' + name.replace(/[:.-](\\w)/g, (_, c) => c.toUpperCase()).replace(/^\\w/, (c) => c.toUpperCase())
      props[key] = bindEmit(name, source)
    }
    const slots = {}
    for (const [name, html] of Object.entries(state.slots)) {
      slots[name] = () => h('span', { innerHTML: String(html) })
    }
    app = mountApp({ render: () => h(Component, props, slots) })
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

function svelteEntry(target: HarnessTarget, css: string[], setup?: string): string {
  const cssImports = css.map((c) => `import ${JSON.stringify(c)}`).join('\n')
  return `import { mount, unmount, createRawSnippet } from 'svelte'
${cssImports}
${setupImport(setup)}

${messageBridge()}
${storyRegistry(target)}
${componentLoader(target)}

if (typeof harnessSetup === 'function') await harnessSetup()

let instance = null
async function render() {
  try {
    if (instance) unmount(instance)
    const props = materializeFns(structuredClone(state.props))
    for (const [name, source] of emitEntries(state.emits)) {
      props[name] = bindEmit(name, source)
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

export function harnessEntrySource(
  framework: ModuleFramework,
  target: HarnessTarget,
  css: string[],
  setup: string | undefined,
  baseline: VueBaseline
): string {
  return framework === 'vue' ? vueEntry(target, css, setup, baseline) : svelteEntry(target, css, setup)
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
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: transparent !important; overflow: hidden; }
      html { color-scheme: light !important; }
      body { color: #18181b; }
      html.dark body { color: #e4e4e7; }
      #host { position: absolute; top: 0; left: 0; right: 0; bottom: 0; margin: 0; padding: 0; overflow: auto; display: flex; }
      #host > * { margin: auto; flex-shrink: 0; }
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

export function resolveHarnessSetup(cwd: string, systemConfig: ModuleSystemConfig): string | undefined {
  if (!systemConfig.setup) return undefined
  return systemConfig.setup.startsWith('.') || isAbsolute(systemConfig.setup)
    ? resolve(cwd, systemConfig.setup)
    : systemConfig.setup
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
  const setup = resolveHarnessSetup(cwd, systemConfig)
  const baseline = detectVueBaseline(cwd, systemConfig)
  for (const target of targets) {
    const dir = join(root, target.component)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.html'), harnessHtml(target.component))
    await writeFile(join(dir, 'entry.ts'), harnessEntrySource(systemConfig.framework, target, css, setup, baseline))
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
