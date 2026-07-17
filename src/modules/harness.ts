import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, resolve, isAbsolute } from 'node:path'
import type { InlineConfig, Plugin, PluginOption } from 'vite'
import type { ModuleFramework, ModuleStageConfig, ModuleSystemConfig, ModulesConfig, ResolvedNimpressConfig } from '../types'
import { mergeDeep } from '../config/viteConfig'
import { resolveComponentSource } from './resolve'
import { mockValue, schemaFromJsonSchema, type ComponentJsonSchema } from './parse/typeMembers'
import type { ComponentPageRef } from './pages'
import { collectComponentPages } from './pages'

export const HARNESS_BASE_PORT = 6161

export const HARNESS_VIRTUAL_PREFIX = 'virtual:nimpress-harness/'

export function harnessPort(modules: ModulesConfig, system: string): number {
  const configured = modules.systems[system]?.port
  if (configured) return configured
  const names = Object.keys(modules.systems).sort()
  return HARNESS_BASE_PORT + Math.max(0, names.indexOf(system))
}

export function harnessEntryId(system: string, component: string): string {
  return `${HARNESS_VIRTUAL_PREFIX}${system}/${component}/entry`
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
  emits: parseParam('emits') ?? [],
  shadow: params.get('shadow') === '1'
}
function applyTheme(mode) {
  if (mode !== 'light' && mode !== 'dark') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.dataset.theme = mode
  const host = document.getElementById('host')
  if (host) host.style.colorScheme = mode
}
applyTheme(params.get('theme'))
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
  if (d.shadow !== undefined) state.shadow = !!d.shadow
  if (globalThis.__nimpressSync) globalThis.__nimpressSync()
})
window.addEventListener('wheel', (event) => {
  if (!event.ctrlKey && !event.metaKey) return
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
})
let panX = 0
let panY = 0
let panning = null
function stageEl() {
  return document.getElementById('stage')
}
function applyPan() {
  const stage = stageEl()
  if (stage) stage.style.transform = panX || panY ? 'translate(' + panX + 'px, ' + panY + 'px)' : ''
}
window.addEventListener('pointerdown', (event) => {
  const pan = event.button === 1 || (event.button === 0 && (event.metaKey || event.ctrlKey))
  if (!pan) return
  event.preventDefault()
  panning = { x: event.clientX, y: event.clientY, tx: panX, ty: panY }
  document.documentElement.style.cursor = 'grabbing'
})
window.addEventListener('pointermove', (event) => {
  if (!panning) return
  panX = panning.tx + (event.clientX - panning.x)
  panY = panning.ty + (event.clientY - panning.y)
  applyPan()
})
window.addEventListener('pointerup', () => {
  if (!panning) return
  panning = null
  document.documentElement.style.cursor = ''
})
window.addEventListener('dblclick', (event) => {
  if (!(event.metaKey || event.ctrlKey)) return
  panX = 0
  panY = 0
  applyPan()
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

function vueEntry(target: HarnessTarget, css: string[], setup: string | undefined, harness: string | undefined, defaults: Record<string, unknown>): string {
  const cssImports = css.map((c) => `import ${JSON.stringify(c)}`).join('\n')
  const harnessImport = harness
    ? `import HarnessOverride from ${JSON.stringify(harness)}`
    : 'const HarnessOverride = null'
  return `import { createApp, h } from 'vue'
import { DefaultHarness, ComponentStory, createHarnessContext, HARNESS_KEY } from '@nimling/nimpress/harness/vue'
${cssImports}
${setupImport(setup)}
${harnessImport}

${messageBridge()}
${storyRegistry(target)}
${componentLoader(target)}

const setupDef = typeof harnessSetup === 'function' ? await harnessSetup() : harnessSetup
const Overlay = setupDef ? (setupDef.companion ?? null) : null
const Harness = HarnessOverride ?? DefaultHarness

function installBaseline(app) {
  if (setupDef && typeof setupDef.install === 'function') {
    setupDef.install(app)
  }
}

const ctx = createHarnessContext()
ctx.overlay.value = Overlay
const isRenderStory = activeStoryDef && typeof activeStoryDef.render === 'function'

const requiredDefaults = ${JSON.stringify(defaults)}
const storyProps = activeStoryDef && activeStoryDef.props ? activeStoryDef.props : {}
const storySlots = activeStoryDef && activeStoryDef.slots ? activeStoryDef.slots : {}

function cloneValue(value) {
  try { return structuredClone(value) } catch { return value }
}

function buildProps() {
  const props = structuredClone(state.props)
  for (const [prop, value] of Object.entries(storyProps)) {
    if (props[prop] === undefined) props[prop] = cloneValue(value)
  }
  for (const [prop, value] of Object.entries(requiredDefaults)) {
    if (props[prop] === undefined) props[prop] = cloneValue(value)
  }
  materializeFns(props)
  for (const [name, source] of emitEntries(state.emits)) {
    const key = 'on' + name.replace(/[:.-](\\w)/g, (_, c) => c.toUpperCase()).replace(/^\\w/, (c) => c.toUpperCase())
    props[key] = bindEmit(name, source)
  }
  return props
}

function buildSlots() {
  const slots = {}
  for (const [name, html] of Object.entries({ ...storySlots, ...state.slots })) {
    slots[name] = () => h('span', { innerHTML: String(html) })
  }
  return slots
}

function sync() {
  ctx.shadow.value = state.shadow
  if (!isRenderStory) {
    ctx.props.value = buildProps()
    ctx.slots.value = buildSlots()
  }
}
globalThis.__nimpressSync = sync

try {
  ctx.component.value = isRenderStory ? activeStoryDef.render() : await ensureComponent()
  sync()
  const StoryHarness = activeStoryDef && activeStoryDef.harness ? activeStoryDef.harness : null
  const Root = {
    render() {
      const leaf = h(ComponentStory)
      const inner = StoryHarness ? h(StoryHarness, null, { default: () => leaf }) : leaf
      return h(Harness, null, { default: () => inner })
    }
  }
  const app = createApp(Root)
  app.provide(HARNESS_KEY, ctx)
  installBaseline(app)
  app.mount('#stage')
} catch (err) {
  console.error(err)
  document.getElementById('host').innerText = String(err)
  parent.postMessage({ type: 'nimpress:error', message: String(err) }, '*')
}
parent.postMessage({ type: 'nimpress:ready' }, '*')
`
}

function svelteEntry(target: HarnessTarget, css: string[], setup: string | undefined, harness: string | undefined, defaults: Record<string, unknown>): string {
  const cssImports = css.map((c) => `import ${JSON.stringify(c)}`).join('\n')
  const harnessImport = harness
    ? `import HarnessOverride from ${JSON.stringify(harness)}`
    : 'const HarnessOverride = null'
  return `import { mount, createRawSnippet } from 'svelte'
import { DefaultHarness, HarnessRoot, createHarnessContext } from '@nimling/nimpress/harness/svelte'
${cssImports}
${setupImport(setup)}
${harnessImport}

${messageBridge()}
${storyRegistry(target)}
${componentLoader(target)}

if (typeof harnessSetup === 'function') await harnessSetup()

const Harness = HarnessOverride ?? DefaultHarness
const ctx = createHarnessContext()
const isRenderStory = activeStoryDef && activeStoryDef.component

const requiredDefaults = ${JSON.stringify(defaults)}
const storyProps = activeStoryDef && activeStoryDef.props ? activeStoryDef.props : {}
const storySlots = activeStoryDef && activeStoryDef.slots ? activeStoryDef.slots : {}

function cloneValue(value) {
  try { return structuredClone(value) } catch { return value }
}

function buildProps() {
  const props = structuredClone(state.props)
  for (const [prop, value] of Object.entries(storyProps)) {
    if (props[prop] === undefined) props[prop] = cloneValue(value)
  }
  for (const [prop, value] of Object.entries(requiredDefaults)) {
    if (props[prop] === undefined) props[prop] = cloneValue(value)
  }
  materializeFns(props)
  for (const [name, source] of emitEntries(state.emits)) {
    props[name] = bindEmit(name, source)
  }
  for (const [name, html] of Object.entries({ ...storySlots, ...state.slots })) {
    props[name] = createRawSnippet(() => ({ render: () => '<span>' + String(html) + '</span>' }))
  }
  return props
}

function sync() {
  ctx.shadow = state.shadow
  ctx.props = buildProps()
}
globalThis.__nimpressSync = sync

try {
  ctx.component = isRenderStory ? activeStoryDef.component : await ensureComponent()
  sync()
  const StoryHarness = activeStoryDef && activeStoryDef.harness ? activeStoryDef.harness : null
  mount(HarnessRoot, { target: document.getElementById('stage'), props: { ctx, harness: Harness, storyHarness: StoryHarness } })
} catch (err) {
  console.error(err)
  document.getElementById('host').innerText = String(err)
  parent.postMessage({ type: 'nimpress:error', message: String(err) }, '*')
}
parent.postMessage({ type: 'nimpress:ready' }, '*')
`
}

function requiredDefaults(target: HarnessTarget): Record<string, unknown> {
  if (!target.schemaFile || !existsSync(target.schemaFile)) return {}
  let raw: ComponentJsonSchema
  try {
    raw = JSON.parse(readFileSync(target.schemaFile, 'utf-8')) as ComponentJsonSchema
  } catch {
    return {}
  }
  const schema = schemaFromJsonSchema(target.component, raw)
  const out: Record<string, unknown> = {}
  for (const spec of schema.props) {
    if (!spec.required) continue
    const value = spec.default !== undefined ? spec.default : mockValue(spec, 0)
    if (value !== undefined) out[spec.name] = value
  }
  return out
}

export function harnessEntrySource(
  framework: ModuleFramework,
  target: HarnessTarget,
  css: string[],
  setup: string | undefined,
  harness: string | undefined
): string {
  const defaults = requiredDefaults(target)
  return framework === 'vue'
    ? vueEntry(target, css, setup, harness, defaults)
    : svelteEntry(target, css, setup, harness, defaults)
}

function stageDim(v: number | string): string {
  return typeof v === 'number' ? `${v}px` : v
}

function stagePadding(stage: ModuleStageConfig | undefined): string {
  return stage?.padding !== undefined ? stageDim(stage.padding) : '24px'
}

function stageWidthCss(stage: ModuleStageConfig | undefined): string {
  if (!stage || (stage.minWidth === undefined && stage.maxWidth === undefined)) return ''
  const dim = stageDim
  const bounds = [
    'display: block;',
    'align-self: flex-start;',
    'margin: 0 auto;',
    'width: 100%;',
    stage.minWidth !== undefined ? `min-width: ${dim(stage.minWidth)};` : '',
    stage.maxWidth !== undefined ? `max-width: ${dim(stage.maxWidth)};` : ''
  ]
  return ' ' + bounds.filter(Boolean).join(' ')
}

export function harnessHtml(component: string, scriptSrc: string, cssHrefs: string[], stage?: ModuleStageConfig): string {
  const links = cssHrefs.map((href) => `    <link rel="stylesheet" href="${href}" />`).join('\n')
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
      #host { position: absolute; top: 0; left: 0; right: 0; bottom: 0; margin: 0; padding: ${stagePadding(stage)}; overflow: auto; display: flex; }
      #stage { margin: auto; flex-shrink: 0; display: flex; align-items: center; justify-content: center; will-change: transform;${stageWidthCss(stage)} }
    </style>
${links ? links + '\n' : ''}  </head>
  <body>
    <div id="host"><div id="stage"></div></div>
    <script type="module" src="${scriptSrc}"></script>
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
  const plugins: PluginOption[] = [vue()]
  try {
    const jsxPath = req.resolve('@vitejs/plugin-vue-jsx')
    const jsxMod = await import(pathToFileURL(jsxPath).href)
    const vueJsx = (jsxMod.default ?? jsxMod) as () => PluginOption
    plugins.push(vueJsx())
  } catch {
    // @vitejs/plugin-vue-jsx is optional; .story.tsx stories need it installed in the consumer
  }
  return plugins
}

export interface HarnessTarget {
  component: string
  importSpec: string
  named?: boolean
  storyFiles?: Array<{ base: string; path: string }>
  schemaFile?: string
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
    const schemaFile = join(dirname(page.pageFile), 'schema.json')
    const source = systemConfig.source
      ? resolveComponentSource(cwd, modules, system, page.component, page.file)
      : null
    if (source) {
      targets.push({ component: page.component, importSpec: source.componentFile, storyFiles, schemaFile })
      continue
    }
    const pkg = page.package ?? systemConfig.package
    if (pkg) {
      targets.push({ component: page.component, importSpec: pkg, named: true, storyFiles, schemaFile })
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
    .filter((name) => name.endsWith('.story.ts') || name.endsWith('.story.tsx'))
    .sort()
    .map((name) => ({
      base: name.endsWith('.story.tsx') ? basename(name, '.story.tsx') : basename(name, '.story.ts'),
      path: join(dir, name)
    }))
}

export function resolveHarnessSetup(cwd: string, systemConfig: ModuleSystemConfig): string | undefined {
  if (!systemConfig.setup) return undefined
  return systemConfig.setup.startsWith('.') || isAbsolute(systemConfig.setup)
    ? resolve(cwd, systemConfig.setup)
    : systemConfig.setup
}

export function resolveHarnessOverride(cwd: string, systemConfig: ModuleSystemConfig): string | undefined {
  if (!systemConfig.harness) return undefined
  return systemConfig.harness.startsWith('.') || isAbsolute(systemConfig.harness)
    ? resolve(cwd, systemConfig.harness)
    : systemConfig.harness
}

function harnessPlugin(
  cwd: string,
  systemConfig: ModuleSystemConfig,
  system: string,
  targets: HarnessTarget[],
  base: string
): Plugin {
  const css = (systemConfig.css ?? []).map((c) =>
    c.startsWith('.') || isAbsolute(c) ? resolve(cwd, c) : c
  )
  const setup = resolveHarnessSetup(cwd, systemConfig)
  const harness = resolveHarnessOverride(cwd, systemConfig)
  const byComponent = new Map(targets.map((t) => [t.component, t]))
  const resolvedPrefix = '\0' + HARNESS_VIRTUAL_PREFIX
  const componentOf = (id: string): string | null => {
    if (!id.startsWith(resolvedPrefix)) return null
    const parts = id.slice(resolvedPrefix.length).split('/')
    return parts[0] === system && parts[1] ? parts[1] : null
  }
  const entrySource = (target: HarnessTarget): string =>
    harnessEntrySource(systemConfig.framework, target, css, setup, harness)
  return {
    name: 'nimpress:harness',
    resolveId(id) {
      if (id.startsWith(resolvedPrefix)) return id
      if (id.startsWith(HARNESS_VIRTUAL_PREFIX)) return '\0' + id
      return null
    },
    load(id) {
      const component = componentOf(id)
      if (!component) return null
      const target = byComponent.get(component)
      return target ? entrySource(target) : null
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const raw = req.url
        if (!raw) return next()
        const path = raw.split('?')[0]
        if (!path.startsWith(base)) return next()
        const segments = path.slice(base.length).split('/').filter(Boolean)
        const component = segments[0]
        if (!component || !byComponent.has(component)) return next()
        const tail = segments.slice(1).join('/')
        if (tail === '' || tail === 'index.html') {
          const client = `    <script type="module" src="${base}@vite/client"></script>\n  </head>`
          const html = harnessHtml(component, './entry.js', [], systemConfig.stage).replace('  </head>', client)
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html')
          res.end(html)
          return
        }
        if (tail === 'entry.js') {
          const result = await server.transformRequest(harnessEntryId(system, component))
          if (!result) return next()
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/javascript')
          res.end(result.code)
          return
        }
        return next()
      })
    },
    generateBundle(_, bundle) {
      const collectCss = (fileName: string, seen: Set<string>, css: Set<string>) => {
        if (seen.has(fileName)) return
        seen.add(fileName)
        const chunk = bundle[fileName]
        if (!chunk || chunk.type !== 'chunk') return
        const meta = (chunk as { viteMetadata?: { importedCss?: Set<string> } }).viteMetadata
        for (const file of meta?.importedCss ?? []) css.add(file)
        for (const imported of chunk.imports) collectCss(imported, seen, css)
      }
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.isEntry) continue
        const target = byComponent.get(chunk.name)
        if (!target) continue
        const css = new Set<string>()
        collectCss(chunk.fileName, new Set(), css)
        const cssHrefs = [...css].map((file) => base + file)
        this.emitFile({
          type: 'asset',
          fileName: `${target.component}/index.html`,
          source: harnessHtml(target.component, base + chunk.fileName, cssHrefs, systemConfig.stage)
        })
      }
    }
  }
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
  const framework = await loadFrameworkPlugin(cwd, systemConfig.framework)
  const sourceRoot = systemConfig.source ? resolve(cwd, systemConfig.source) : cwd
  const routeBase = modules.route.replace(/\/$/, '')
  const base = `${routeBase}/${system}/`
  const scanEntries = targets
    .filter((t) => isAbsolute(t.importSpec))
    .map((t) => t.importSpec)
    .concat(targets.flatMap((t) => (t.storyFiles ?? []).map((s) => s.path)))
  const config: InlineConfig = {
    root: cwd,
    configFile: false,
    publicDir: false,
    appType: 'mpa',
    cacheDir: join(cwd, 'node_modules', '.vite-nimpress', system),
    plugins: [harnessPlugin(cwd, systemConfig, system, targets, base), framework],
    resolve: systemConfig.framework === 'vue' ? { alias: { vue: 'vue/dist/vue.esm-bundler.js' } } : undefined,
    optimizeDeps: {
      entries: scanEntries,
      include: systemConfig.framework === 'vue' ? ['vue'] : [],
      exclude: ['@nimling/nimpress/harness/vue', '@nimling/nimpress/harness/svelte']
    },
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
        input: Object.fromEntries(targets.map((t) => [t.component, harnessEntryId(system, t.component)]))
      }
    },
    base
  }
  return mergeDeep(config, resolvedConfig.vite as Partial<InlineConfig>)
}
