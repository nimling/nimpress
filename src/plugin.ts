import type { Plugin, ViteDevServer } from 'vite'
import { readFile, readdir, copyFile, cp, mkdir, writeFile } from 'node:fs/promises'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { execFileSync } from 'node:child_process'
import { resolve, relative, join, sep, dirname, isAbsolute, extname } from 'node:path'
import { createHash } from 'node:crypto'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import attrs from 'markdown-it-attrs'
import container from 'markdown-it-container'
import deflist from 'markdown-it-deflist'
import footnote from 'markdown-it-footnote'
import taskLists from 'markdown-it-task-lists'
import { z } from 'zod'
import { createHighlighter, type Highlighter } from 'shiki'
import { buildBanner, readConsumerPackage } from './banner'
import type {
  ChangelogEntry,
  ComponentPageData,
  Frontmatter,
  Heading,
  NimpressUserConfig,
  PageMeta,
  PageType,
  ResolvedNimpressConfig,
  RoadmapChangelogRef,
  RoadmapEntry,
  RoadmapKind,
  RoadmapStatus,
  SearchEntry,
  SidebarNode
} from './types'
import { buildComponentPageData } from './modules/componentData'
import { harnessPort } from './modules/harness'
import { defaultConfig } from './config/defaults'
import { loadNimpressConfig, runtimeConfig } from './config/load'
import { indexHtml } from './config/html'

const VIRTUAL_MANIFEST = 'virtual:nimpress/manifest'
const VIRTUAL_SEARCH = 'virtual:nimpress/search'
const VIRTUAL_PAGES = 'virtual:nimpress/pages'
const VIRTUAL_BODIES = 'virtual:nimpress/bodies'
const VIRTUAL_CONFIG = 'virtual:nimpress/config'
const VIRTUAL_MAIN = 'virtual:nimpress/main'
const PAGE_COMPONENT_PREFIX = 'virtual:nimpress/page-component/'
const PAGE_BODY_PREFIX = 'virtual:nimpress/page-body/'
const FEED_PAGE_SIZE = 20
const FEED_NAMESPACE = 'https://github.com/nimling/nimpress'

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`
}

function feedFileName(index: number): string {
  return index === 0 ? 'rss.xml' : `rss-${index + 1}.xml`
}

const CRAWL_AGENTS = [
  'Google-Extended', 'Applebot-Extended', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot',
  'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'anthropic-ai', 'PerplexityBot',
  'Perplexity-User', 'MistralAI-User', 'Amazonbot', 'cohere-ai', 'cohere-training-data-crawler',
  'CCBot', 'Bytespider', 'Diffbot', 'img2dataset', 'PetalBot', 'YouBot', 'Quora-Bot',
  'TikTokSpider', 'Webzio-Extended', 'AI2Bot', 'Ai2Bot-Dolma', 'omgili', 'omgilibot',
  'aiHitBot', 'Timpibot', 'Kagibot', 'ZoomBot', 'AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot'
]

function jsonLdScript(data: unknown): string {
  const json = (typeof data === 'string' ? data : JSON.stringify(data)).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}

const openGraphSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  url: z.string().optional(),
  siteName: z.string().optional(),
  locale: z.string().optional()
}).passthrough()

const twitterSchema = z.object({
  card: z.string().optional(),
  site: z.string().optional(),
  creator: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  imageAlt: z.string().optional()
}).passthrough()

const metaTagsSchema = z.object({
  description: z.string().optional(),
  canonical: z.string().optional(),
  robots: z.string().optional(),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
  author: z.string().optional(),
  themeColor: z.string().optional(),
  og: openGraphSchema.optional(),
  twitter: twitterSchema.optional(),
  jsonLd: z.unknown().optional()
}).passthrough()

const frontmatterSchema = z.object({
  title: z.string(),
  slug: z.string().optional(),
  type: z.union([
    z.literal('doc'),
    z.literal('openapi'),
    z.literal('changelog'),
    z.literal('hero'),
    z.literal('roadmap'),
    z.literal('milestone'),
    z.literal('epic'),
    z.literal('feature'),
    z.literal('bug'),
    z.literal('component')
  ]).optional(),
  path: z.string().optional(),
  spec: z.string().optional(),
  scope: z.string().optional(),
  claim: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  icon: z.string().optional(),
  group: z.object({
    name: z.string().min(1),
    icon: z.string().optional(),
    style: z.string().optional()
  }).optional(),
  hidden: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  lastUpdated: z.boolean().optional(),
  redirect: z.string().optional(),
  noToc: z.boolean().optional(),
  footer: z.string().optional(),
  background: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  rss: z.boolean().optional(),
  subscribe: z.boolean().optional(),
  meta: metaTagsSchema.optional(),
  data: z.record(z.unknown()).optional()
}).passthrough()

function frontmatterIssues(data: unknown): string[] {
  const issues: string[] = []
  const parsed = frontmatterSchema.safeParse(data)
  if (!parsed.success) {
    for (const e of parsed.error.errors) {
      issues.push(`${e.path.join('.') || 'frontmatter'}: ${e.message}`)
    }
    return issues
  }
  const fm = parsed.data
  const d = (fm.data ?? {}) as Record<string, unknown>
  if (fm.type === 'openapi' && !fm.spec) {
    issues.push('type openapi requires a spec field')
  }
  if (fm.type === 'changelog') {
    if (d.version === undefined || String(d.version).trim() === '') issues.push('changelog requires data.version')
    if (d.release_date === undefined || Number.isNaN(new Date(String(d.release_date)).getTime())) {
      issues.push('changelog requires a valid data.release_date')
    }
    const title = d.title === undefined ? '' : String(d.title)
    if (!title.trim()) issues.push('changelog requires data.title')
    if (title.length > 48) issues.push('changelog data.title exceeds 48 characters')
    if (title.includes(',')) issues.push('changelog data.title must not contain a comma')
    if (d.description !== undefined && String(d.description).length > 160) {
      issues.push('changelog data.description exceeds 160 characters')
    }
  }
  if (fm.type === 'milestone' || fm.type === 'epic' || fm.type === 'feature' || fm.type === 'bug') {
    if (!fm.description) issues.push(`type ${fm.type} requires a description`)
    if (d.date === undefined || Number.isNaN(new Date(String(d.date)).getTime())) {
      issues.push(`type ${fm.type} requires a valid data.date`)
    }
  }
  if (fm.type === 'component') {
    if (d.system === undefined || String(d.system).trim() === '') issues.push('type component requires data.system')
    if (d.component === undefined || String(d.component).trim() === '') issues.push('type component requires data.component')
  }
  return issues
}

interface ProcessedPage {
  slug: string
  filePath: string
  effectivePath: string
  type: PageType
  frontmatter: Frontmatter
  html: string
  headings: Heading[]
  rawText: string
  pageCss?: string
  openApiSpec?: unknown
  changelogEntries?: ChangelogEntry[]
  roadmapEntries?: RoadmapEntry[]
  componentData?: ComponentPageData
}

function compareVersions(a: string, b: string): number {
  const pa = String(a ?? '').replace(/^v/i, '').split(/[.\-+]/)
  const pb = String(b ?? '').replace(/^v/i, '').split(/[.\-+]/)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const ai = parseInt(pa[i] ?? '0', 10) || 0
    const bi = parseInt(pb[i] ?? '0', 10) || 0
    if (ai !== bi) return ai - bi
  }
  return 0
}

function slugFromPath(root: string, file: string): string {
  const rel = relative(root, file).split(sep).join('/')
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(
      `[nimpress] content file is outside contentDir.\n  contentDir: ${root}\n  file: ${file}\nCheck the working directory you run vite from and the contentDir option.`
    )
  }
  return rel.replace(/\.md$/, '').replace(/\/index$/, '').replace(/^index$/, '')
}

function parentSlug(slug: string): string {
  const idx = slug.lastIndexOf('/')
  return idx >= 0 ? slug.slice(0, idx) : ''
}

function defaultPathFromSlug(slug: string): string {
  if (!slug) return '/'
  return '/' + slug
}

function normalizePath(p: string): string {
  if (!p) return '/'
  let out = p.startsWith('/') ? p : '/' + p
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1)
  return out
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue
      await walk(full, out)
    } else if (e.isFile() && e.name.endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function storyAnchor(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type ContainerOpts = {
  render: (tokens: { nesting: number; info: string }[], idx: number) => string
  validate?: (params: string) => boolean
}

function buildMarkdownIt(highlighter: Highlighter): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    highlight(code: string, lang: string, attrs: string): string {
      const aliases: Record<string, string> = {
        curl: 'bash',
        sh: 'bash',
        zsh: 'bash',
        console: 'bash',
        hurl: 'http'
      }
      const labelMatch = attrs ? attrs.match(/\[([^\]]+)\]/) : null
      const display = (labelMatch?.[1].trim() || lang || 'text').trim()
      const resolvedLang = aliases[lang] ?? lang
      const safeLang = resolvedLang && highlighter.getLoadedLanguages().includes(resolvedLang as never) ? resolvedLang : 'text'
      try {
        const html = highlighter.codeToHtml(code, { lang: safeLang, theme: 'github-dark' })
        return html.replace('<pre ', `<pre data-lang="${md.utils.escapeHtml(display)}" `)
      } catch {
        return `<pre data-lang="${md.utils.escapeHtml(display)}"><code>${md.utils.escapeHtml(code)}</code></pre>`
      }
    }
  })

  md.use(anchor, {
    slugify,
    permalink: anchor.permalink.headerLink({ safariReaderFix: true })
  })
  md.use(attrs)
  md.use(deflist)
  md.use(footnote)
  md.use(taskLists, { enabled: true })

  const useContainer = (name: string, opts: ContainerOpts) => {
    ;(md.use as (...args: unknown[]) => MarkdownIt)(container, name, opts)
  }

  const calloutTypes = ['tip', 'note', 'warning', 'info', 'check']
  for (const type of calloutTypes) {
    useContainer(type, {
      render(tokens, idx) {
        if (tokens[idx].nesting === 1) {
          const title = tokens[idx].info.trim().slice(type.length).trim() || type
          return `<div class="np-callout np-callout-${type}"><div class="np-callout-body"><div class="np-callout-title">${md.utils.escapeHtml(title)}</div>`
        }
        return '</div></div>'
      }
    })
  }

  useContainer('cards', {
    render(tokens, idx) {
      return tokens[idx].nesting === 1
        ? '<div class="np-cards-grid">'
        : '</div>'
    }
  })

  useContainer('details', {
    validate(params) {
      return /^details\b/.test(params.trim())
    },
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        const m = tokens[idx].info.trim().match(/^details\s*(.*)$/)
        const title = (m && m[1]) || 'Details'
        return `<details class="np-details"><summary class="np-details-summary">${md.utils.escapeHtml(title)}</summary><div class="np-details-body">\n`
      }
      return '</div></details>\n'
    }
  })

  useContainer('code-group', {
    render(tokens, idx) {
      return tokens[idx].nesting === 1
        ? '<div class="np-code-group">'
        : '</div>'
    }
  })

  useContainer('actions', {
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        const json = tokens[idx].info.trim().slice('actions'.length).trim()
        const data = json ? safeParseJson(json, tokens[idx].info) : {}
        const align = typeof data?.align === 'string' ? data.align : 'start'
        return `<div class="np-actions" data-align="${md.utils.escapeHtml(align)}">`
      }
      return '</div>'
    }
  })

  useContainer('features', {
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        const json = tokens[idx].info.trim().slice('features'.length).trim()
        const data = json ? safeParseJson(json, tokens[idx].info) : {}
        const cols = typeof data?.columns === 'number' ? data.columns : 0
        const colsAttr = cols > 0 ? ` data-columns="${cols}"` : ''
        return `<div class="np-features"${colsAttr}>`
      }
      return '</div>'
    }
  })

  useContainer('feature', {
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        const json = tokens[idx].info.trim().slice('feature'.length).trim()
        const data = json ? safeParseJson(json, tokens[idx].info) : {}
        const payload = encodeAttr(JSON.stringify(data))
        return `<div class="np-feature" data-config="${payload}"><div class="np-feature-body">`
      }
      return '</div></div>'
    }
  })

  return md
}

function safeParseJson(raw: string, full: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return {}
  } catch {
    console.warn(`[nimpress] invalid JSON in directive: ${full}`)
    return {}
  }
}

function encodeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function rewriteMermaid(source: string): string {
  return source.replace(/```mermaid\n([\s\S]*?)```/g, (_, body) => {
    const encoded = Buffer.from(body, 'utf-8').toString('base64')
    return `<div class="np-mermaid" data-graph="${encoded}"></div>`
  })
}

function extractInlineText(token: { content?: string; children?: unknown[] } | undefined): string {
  if (!token) return ''
  const parts: string[] = []
  const walk = (children: unknown[] | undefined) => {
    if (!children) return
    for (const c of children as Array<{ type: string; content?: string; children?: unknown[] }>) {
      if (c.type === 'text' || c.type === 'code_inline') parts.push(c.content ?? '')
      else if (c.children) walk(c.children)
    }
  }
  walk(token.children)
  const collected = parts.join('').trim()
  if (collected) return collected
  return (token.content ?? '').trim()
}

function collectHeadings(md: MarkdownIt, source: string): Heading[] {
  const tokens = md.parse(source, {})
  const headings: Heading[] = []
  let counter = 0
  const seen = new Map<string, number>()
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === 'heading_open') {
      const level = parseInt(t.tag.slice(1))
      const inline = tokens[i + 1] as unknown as { content?: string; children?: unknown[] }
      const text = extractInlineText(inline) || `heading-${counter++}`
      let slug = slugify(text)
      if (!slug) slug = `heading-${counter++}`
      const prev = seen.get(slug)
      if (prev !== undefined) {
        const next = prev + 1
        seen.set(slug, next)
        slug = `${slug}-${next}`
      } else {
        seen.set(slug, 0)
      }
      headings.push({ level, text, slug })
    }
  }
  return headings
}

function comparePages(a: ProcessedPage, b: ProcessedPage): number {
  const ao = a.frontmatter.order ?? Number.MAX_SAFE_INTEGER
  const bo = b.frontmatter.order ?? Number.MAX_SAFE_INTEGER
  if (ao !== bo) return ao - bo
  return a.effectivePath.localeCompare(b.effectivePath)
}

function pageLabel(p: ProcessedPage): string {
  return p.frontmatter.slug ?? p.frontmatter.title
}

function nearestAncestorPath(
  path: string,
  knownPaths: Set<string>
): string | null {
  const segments = path.split('/').filter(Boolean)
  for (let i = segments.length - 1; i >= 1; i--) {
    const candidate = '/' + segments.slice(0, i).join('/')
    if (knownPaths.has(candidate)) return candidate
  }
  return null
}

function prettyDirName(segment: string): string {
  if (!segment) return ''
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function sortNodes(nodes: SidebarNode[]) {
  nodes.sort((a, b) => {
    const ao = a.order ?? Number.MAX_SAFE_INTEGER
    const bo = b.order ?? Number.MAX_SAFE_INTEGER
    if (ao !== bo) return ao - bo
    return a.text.localeCompare(b.text)
  })
  for (const n of nodes) {
    if (n.items) sortNodes(n.items)
  }
}

export default function nimpress(inline?: Partial<NimpressUserConfig>): Plugin {
  let resolved: ResolvedNimpressConfig = defaultConfig
  let contentRoot = resolve(process.cwd(), defaultConfig.contentDir)
  let assetsRoot = resolve(process.cwd(), defaultConfig.assetsDir)
  let pages = new Map<string, ProcessedPage>()
  let highlighter: Highlighter | null = null
  let resolvedOutDir = resolve(process.cwd(), 'dist')
  let isBuildCommand = false
  let server: ViteDevServer | null = null
  const fileCache = new Map<string, { hash: string; processed: ProcessedPage }>()
  const specToMd = new Map<string, string>()
  const trackedSpecs = new Set<string>()
  const componentToMd = new Map<string, string>()
  const trackedComponents = new Set<string>()

  function hashContent(text: string): string {
    return createHash('sha1').update(text).digest('hex')
  }

  async function ensureHighlighter() {
    if (highlighter) return highlighter
    highlighter = await createHighlighter({
      themes: ['github-dark'],
      langs: [
        'ts', 'tsx', 'js', 'jsx', 'json', 'bash', 'shell', 'yaml',
        'go', 'sql', 'html', 'css', 'svelte', 'vue', 'md', 'rust',
        'python', 'http', 'diff', 'text'
      ]
    })
    return highlighter
  }

  async function loadSpec(mdFile: string, specRef: string): Promise<unknown | null> {
    try {
      const target = isAbsolute(specRef)
        ? specRef
        : resolve(dirname(mdFile), specRef)
      const raw = await readFile(target, 'utf-8')
      const top = JSON.parse(raw) as any
      await inlineExternalRefs(top, dirname(target))
      return top
    } catch (err) {
      console.warn(`[nimpress] failed to load spec ${specRef} for ${mdFile}:`, err)
      return null
    }
  }

  async function inlineExternalRefs(top: any, topDir: string): Promise<void> {
    if (!top || typeof top !== 'object') return
    if (!top.components) top.components = {}
    if (!top.components.schemas) top.components.schemas = {}
    const schemas = top.components.schemas as Record<string, any>
    const seen = new Map<string, string>()

    const loadJsonFile = async (absPath: string): Promise<any> => {
      const raw = await readFile(absPath, 'utf-8')
      return JSON.parse(raw)
    }

    const ensureSchema = async (absPath: string): Promise<string> => {
      if (seen.has(absPath)) return seen.get(absPath)!
      const fileName = absPath.split('/').pop() ?? ''
      const name = fileName.replace(/\.json$/, '')
      seen.set(absPath, name)
      const content = await loadJsonFile(absPath)
      await walkRefs(content, dirname(absPath))
      schemas[name] = content
      return name
    }

    const walkRefs = async (node: any, baseDir: string): Promise<void> => {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) {
        for (const child of node) await walkRefs(child, baseDir)
        return
      }
      const ref = node.$ref
      if (typeof ref === 'string' && !ref.startsWith('#')) {
        const absPath = isAbsolute(ref) ? ref : resolve(baseDir, ref)
        const parentDir = dirname(absPath).split('/').pop() ?? ''
        if (parentDir === 'schemas') {
          const name = await ensureSchema(absPath)
          node.$ref = `#/components/schemas/${name}`
          return
        }
        if (parentDir === 'operations') {
          const content = await loadJsonFile(absPath)
          await walkRefs(content, dirname(absPath))
          delete node.$ref
          for (const k of Object.keys(content)) node[k] = content[k]
          return
        }
        return
      }
      for (const k of Object.keys(node)) {
        await walkRefs(node[k], baseDir)
      }
    }

    for (const name of Object.keys(schemas)) {
      const entry = schemas[name]
      if (entry && typeof entry === 'object' && typeof entry.$ref === 'string' && !entry.$ref.startsWith('#')) {
        const absPath = isAbsolute(entry.$ref) ? entry.$ref : resolve(topDir, entry.$ref)
        seen.set(absPath, name)
        const content = await loadJsonFile(absPath)
        await walkRefs(content, dirname(absPath))
        schemas[name] = content
      }
    }

    for (const key of Object.keys(top)) {
      if (key === 'components') continue
      await walkRefs(top[key], topDir)
    }
  }

  function specResolveRef(spec: any, ref: string): unknown {
    if (typeof ref !== 'string' || !ref.startsWith('#/')) return null
    const segments = ref.slice(2).split('/').map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
    let cursor: any = spec
    for (const seg of segments) {
      if (cursor == null) return null
      cursor = cursor[seg]
    }
    return cursor
  }

  function resolveStructural(value: any, spec: any, depth = 0): any {
    if (depth > 4) return value
    if (!value || typeof value !== 'object') return value
    if (typeof (value as any).$ref !== 'string') return value
    const target = specResolveRef(spec, (value as any).$ref)
    if (target == null) return value
    return resolveStructural(target, spec, depth + 1)
  }

  function renderMd(md: MarkdownIt, text: unknown): string | undefined {
    if (typeof text !== 'string' || text === '') return undefined
    try {
      return md.render(text)
    } catch {
      return undefined
    }
  }

  function flattenSpecForEmbed(rawSpec: any, md: MarkdownIt) {
    if (!rawSpec) return null
    const spec = rawSpec
    const info = spec.info ?? {}
    const securitySchemes = spec.components?.securitySchemes ?? {}
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
    const exampleFromSchema = (schemaOrRef: any): unknown => {
      const resolved = resolveStructural(schemaOrRef, spec)
      return resolved?.example
    }

    interface FlatParam {
      name: string
      in: string
      required?: boolean
      schema?: unknown
      description?: string
      description_html?: string
      example?: unknown
    }

    interface FlatOp {
      id: string
      method: string
      path: string
      tag: string
      summary: string
      summary_html?: string
      description?: string
      description_html?: string
      parameters: FlatParam[]
      requestBody?: unknown
      requestBodyHtml?: string
      requestExample?: unknown
      responses?: Record<string, unknown>
      responseExamples?: Record<string, unknown>
      security?: unknown[]
      operationName?: string
    }

    const tagMap = new Map<string, FlatOp[]>()
    const paths = spec.paths ?? {}

    for (const [path, pathItemRaw] of Object.entries(paths) as [string, any][]) {
      const pathItem = resolveStructural(pathItemRaw, spec)
      if (!pathItem || typeof pathItem !== 'object') continue
      const inheritedParams = ((pathItem.parameters ?? []) as any[]).map((p) => resolveStructural(p, spec))
      for (const method of methods) {
        const op = pathItem[method]
        if (!op) continue
        const id = op.operationId ?? `${method}-${path.replace(/[^a-z0-9]+/gi, '-')}`
        const tag = op.tags?.[0] ?? 'default'
        const opParams = ((op.parameters ?? []) as any[]).map((p) => resolveStructural(p, spec))
        const merged = [...inheritedParams, ...opParams]
        const seenParams = new Set<string>()
        const parameters: FlatParam[] = []
        for (const raw of merged) {
          const p = raw as any
          if (!p || typeof p !== 'object') continue
          if (!p.name || !p.in) continue
          const key = `${p.name}@${p.in}`
          if (seenParams.has(key)) continue
          seenParams.add(key)
          parameters.push({
            name: p.name,
            in: p.in,
            required: p.required,
            schema: p.schema,
            description: p.description,
            description_html: renderMd(md, p.description),
            example: p.example ?? exampleFromSchema(p.schema)
          })
        }

        const reqBody = op.requestBody ? resolveStructural(op.requestBody, spec) : undefined
        const reqJson = reqBody?.content?.['application/json']
        const reqExample =
          reqJson?.example ??
          (reqJson?.examples ? Object.values(reqJson.examples as Record<string, any>)[0]?.value : undefined) ??
          exampleFromSchema(reqJson?.schema)

        const responseExamples: Record<string, unknown> = {}
        const responses: Record<string, any> = {}
        for (const [code, rRaw] of Object.entries(op.responses ?? {}) as [string, any][]) {
          const r = resolveStructural(rRaw, spec)
          responses[code] = r
          const rJson = r?.content?.['application/json']
          const ex =
            rJson?.example ??
            (rJson?.examples ? Object.values(rJson.examples as Record<string, any>)[0]?.value : undefined) ??
            exampleFromSchema(rJson?.schema)
          if (ex !== undefined) responseExamples[code] = ex
        }

        const flatOp: FlatOp = {
          id,
          method: method.toUpperCase(),
          path,
          tag,
          summary: op.summary ?? id,
          summary_html: renderMd(md, op.summary),
          description: op.description,
          description_html: renderMd(md, op.description),
          parameters,
          requestBody: reqBody,
          requestBodyHtml: renderMd(md, reqBody?.description),
          requestExample: reqExample,
          responses,
          responseExamples,
          security: op.security ?? spec.security,
          operationName: op.operationId
        }
        if (!tagMap.has(tag)) tagMap.set(tag, [])
        tagMap.get(tag)!.push(flatOp)
      }
    }

    const tags = [...tagMap.entries()]
      .map(([name, ops]) => ({ name, operations: ops }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const schemasRaw = spec.components?.schemas ?? {}
    const schemas: Record<string, any> = {}
    for (const [name, s] of Object.entries(schemasRaw) as [string, any][]) {
      const html = renderMd(md, s?.description)
      schemas[name] = html ? { ...s, description_html: html } : s
    }

    return {
      title: info.title ?? 'API',
      version: info.version ?? '',
      description: info.description,
      description_html: renderMd(md, info.description),
      servers: spec.servers,
      securitySchemes,
      tags,
      schemas
    }
  }

  async function processFile(file: string): Promise<ProcessedPage | null> {
    const raw = await readFile(file, 'utf-8')
    const { data, content } = matter(raw)

    const issues = frontmatterIssues(data)
    if (issues.length) {
      const detail = `${file}\n  ${issues.join('\n  ')}`
      if (isBuildCommand) throw new Error(`[nimpress] invalid frontmatter in ${detail}`)
      console.warn(`[nimpress] invalid frontmatter in ${detail}`)
    }
    const parsed = frontmatterSchema.safeParse(data)
    const fm = (parsed.success ? parsed.data : { title: file }) as Frontmatter

    const slug = slugFromPath(contentRoot, file)
    const type: PageType = fm.type ?? 'doc'
    const effectivePath = normalizePath(fm.path ?? defaultPathFromSlug(slug))

    const defaults = resolved.defaultFrontmatter ?? {}
    const defaultExcludes = resolved.defaultFrontmatterExclude ?? []
    const isExcludedFromDefaults = defaultExcludes.some((prefix) => {
      const p = prefix.startsWith('/') ? prefix : '/' + prefix
      return effectivePath === p || effectivePath.startsWith(p + '/')
    })
    if (!isExcludedFromDefaults) {
      for (const [key, value] of Object.entries(defaults)) {
        const k = key as keyof Frontmatter
        if (fm[k] === undefined || fm[k] === null || fm[k] === '') {
          ;(fm as unknown as Record<string, unknown>)[k] = value
        }
      }
    }

    const hl = await ensureHighlighter()
    const md = buildMarkdownIt(hl)
    const prepared = rewriteMermaid(content)
    const headings = collectHeadings(md, prepared)
    const html = md.render(prepared)

    let openApiSpec: unknown | undefined
    let specPath: string | undefined
    if (type === 'openapi') {
      if (!fm.spec) {
        console.warn(`[nimpress] page ${file} has type openapi but no spec field`)
      } else {
        specPath = isAbsolute(fm.spec) ? fm.spec : resolve(dirname(file), fm.spec)
        const raw = await loadSpec(file, fm.spec)
        openApiSpec = raw ? flattenSpecForEmbed(raw, md) ?? undefined : undefined
      }
    }

    rememberSpecBinding(file, specPath)

    let componentData: ComponentPageData | undefined
    let componentWatch: string[] = []
    if (type === 'component') {
      const built = await buildComponentPageData({
        cwd: process.cwd(),
        modules: resolved.modules,
        pageFile: file,
        data: (fm.data ?? {}) as Record<string, unknown>,
        editable: !isBuildCommand
      })
      componentData = built.data
      componentWatch = built.watchFiles
    }
    rememberComponentBinding(file, componentWatch)

    const cssFile = file.replace(/\.md$/, '.css')
    let pageCss: string | undefined
    if (cssFile !== file && existsSync(cssFile)) {
      pageCss = await readFile(cssFile, 'utf-8')
    }

    return {
      slug,
      filePath: file,
      effectivePath,
      type,
      frontmatter: fm,
      html,
      headings,
      rawText: content,
      pageCss,
      openApiSpec,
      componentData
    }
  }

  function rememberSpecBinding(mdFile: string, specPath: string | undefined): void {
    for (const [s, m] of specToMd) {
      if (m === mdFile) specToMd.delete(s)
    }
    if (specPath) {
      specToMd.set(specPath, mdFile)
      if (server && !trackedSpecs.has(specPath)) {
        server.watcher.add(specPath)
        trackedSpecs.add(specPath)
      }
    }
  }

  function rememberComponentBinding(mdFile: string, watchFiles: string[]): void {
    for (const [s, m] of componentToMd) {
      if (m === mdFile) componentToMd.delete(s)
    }
    for (const wf of watchFiles) {
      componentToMd.set(wf, mdFile)
      if (server && !trackedComponents.has(wf)) {
        server.watcher.add(wf)
        trackedComponents.add(wf)
      }
    }
  }

  async function processFileCached(file: string): Promise<ProcessedPage | null> {
    let raw: string
    try {
      raw = await readFile(file, 'utf-8')
    } catch {
      return null
    }
    const hash = hashContent(raw)
    const hit = fileCache.get(file)
    if (hit && hit.hash === hash) return hit.processed
    const processed = await processFile(file)
    if (!processed) {
      fileCache.delete(file)
      return null
    }
    fileCache.set(file, { hash, processed })
    return processed
  }

  function dropFileCache(file: string): void {
    fileCache.delete(file)
  }

  function isExcluded(slug: string): boolean {
    const list = resolved.exclude ?? []
    for (const pattern of list) {
      const norm = pattern.replace(/\/$/, '')
      if (slug === norm) return true
      if (slug.startsWith(norm + '/')) return true
    }
    return false
  }

  async function processAll() {
    const files = await walk(contentRoot)
    const result = new Map<string, ProcessedPage>()
    const pathToFile = new Map<string, string>()
    const changelogGroups = new Map<string, ProcessedPage[]>()
    const roadmapGroups = new Map<string, ProcessedPage[]>()
    const componentDirs = new Map<string, string>()
    const allProcessed: ProcessedPage[] = []

    const fileSet = new Set(files)
    for (const cached of [...fileCache.keys()]) {
      if (!fileSet.has(cached)) fileCache.delete(cached)
    }
    for (const file of files) {
      let p: ProcessedPage | null = null
      try {
        p = await processFileCached(file)
      } catch (err) {
        console.warn(`[nimpress] failed to process ${file}:`, err)
        continue
      }
      if (!p) continue
      if (isExcluded(p.slug)) continue
      allProcessed.push(p)
      if (p.type === 'changelog') {
        const parent = parentSlug(p.slug)
        const groupKey = `${parent}\u0000${p.frontmatter.title}`
        const list = changelogGroups.get(groupKey) ?? []
        list.push(p)
        changelogGroups.set(groupKey, list)
        continue
      }
      if (p.type === 'roadmap') {
        const groupKey = String(p.filePath)
        roadmapGroups.set(groupKey, [p])
      }
      if (p.type === 'component') {
        const dir = dirname(p.filePath)
        const other = componentDirs.get(dir)
        if (other) {
          throw new Error(
            `[nimpress] one type component page per folder: ${dir} holds ${other} and ${p.filePath}`
          )
        }
        componentDirs.set(dir, p.filePath)
      }
      const seen = pathToFile.get(p.effectivePath)
      if (seen) {
        throw new Error(
          `[nimpress] duplicate path ${p.effectivePath}: ${seen} and ${p.filePath}`
        )
      }
      pathToFile.set(p.effectivePath, p.filePath)
      result.set(p.slug, p)
    }

    for (const [groupKey, entries] of changelogGroups) {
      const parent = groupKey.split('\u0000', 1)[0]
      const path = normalizePath(parent ? '/' + parent : '/')
      if (pathToFile.has(path)) {
        throw new Error(
          `[nimpress] path ${path} is occupied by both a changelog collection and a regular page`
        )
      }
      const visible = entries.filter((e) => !(isBuildCommand && e.frontmatter.hidden))
      if (visible.length === 0) continue
      visible.sort((a, b) => {
        const va = String((a.frontmatter.data as Record<string, unknown> | undefined)?.version ?? '')
        const vb = String((b.frontmatter.data as Record<string, unknown> | undefined)?.version ?? '')
        return compareVersions(vb, va)
      })
      const top = visible[0]
      const mergedSlug = `__changelog__${(parent || 'root').replace(/\//g, '__')}`
      const built: ChangelogEntry[] = visible.map((e) => {
        const data = e.frontmatter.data as Record<string, unknown> | undefined
        const version = String(data?.version ?? '')
        const entryTitle = String(data?.title ?? '')
        const entryDescription = data?.description !== undefined ? String(data.description) : undefined
        const rawDate = data?.release_date
        let releaseDate: string | undefined
        if (rawDate !== undefined && rawDate !== null && String(rawDate).trim() !== '') {
          const iso = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate)
          const parsed = new Date(iso)
          if (Number.isNaN(parsed.getTime())) {
            throw new Error(
              `[nimpress] changelog entry ${e.filePath} has an invalid data.release_date (${iso}). Use an RFC 3339 timestamp like 2026-06-10 or 2026-06-10T09:00:00Z.`
            )
          }
          releaseDate = parsed.toISOString()
        }
        return {
          version,
          slug: version ? `v${version}` : 'unreleased',
          title: entryTitle,
          description: entryDescription,
          releaseDate,
          hidden: e.frontmatter.hidden,
          html: e.html,
          headings: e.headings,
          data: e.frontmatter.data
        }
      })
      const mergedHeadings: Heading[] = built.map((e) => ({
        level: 2,
        text: e.version ? `v${e.version}` : (e.title || 'unreleased'),
        slug: e.slug
      }))
      const merged: ProcessedPage = {
        slug: mergedSlug,
        filePath: top.filePath,
        effectivePath: path,
        type: 'changelog',
        frontmatter: {
          ...top.frontmatter,
          path,
          type: 'changelog',
          rss: visible.some((e) => e.frontmatter.rss === true) ? true : undefined,
          subscribe: visible.some((e) => e.frontmatter.subscribe === true) ? true : undefined
        },
        html: '',
        headings: mergedHeadings,
        rawText: visible.map((e) => e.rawText).join('\n\n'),
        changelogEntries: built
      }
      pathToFile.set(path, merged.filePath)
      result.set(merged.slug, merged)
    }

    attachRoadmapEntries(roadmapGroups, allProcessed)

    buildChangelogFeeds(result)

    pages = result
  }

  const feedFiles = new Map<string, string>()

  function buildChangelogFeeds(result: Map<string, ProcessedPage>): void {
    feedFiles.clear()
    const siteUrl = resolved.site?.url?.replace(/\/$/, '')
    for (const p of result.values()) {
      if (p.type !== 'changelog') continue
      if (!(p.frontmatter.rss === true || p.frontmatter.subscribe === true)) continue
      if (!siteUrl) {
        console.warn(`[nimpress] changelog feed for ${p.effectivePath} needs site.url in the config, skipping`)
        continue
      }
      const entries = (p.changelogEntries ?? []).filter((e) => !e.hidden)
      if (entries.length === 0) continue
      const basePath = p.effectivePath === '/' ? '' : p.effectivePath
      const pageUrl = `${siteUrl}${basePath || '/'}`
      const gatedPrefix = isGated(p) ? '/_gated' : ''
      const feedPath = (index: number) => `${gatedPrefix}${basePath}/${feedFileName(index)}`
      const dates = entries
        .map((e) => (e.releaseDate ? new Date(e.releaseDate).getTime() : Number.NaN))
        .filter((t) => !Number.isNaN(t))
        .sort((a, b) => b - a)
      const deltas: number[] = []
      for (let i = 0; i + 1 < dates.length; i++) deltas.push(dates[i] - dates[i + 1])
      const cadenceSeconds = deltas.length
        ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length / 1000)
        : undefined
      const ttlMinutes = cadenceSeconds
        ? Math.min(43200, Math.max(60, Math.round(cadenceSeconds / 60)))
        : 1440
      const updatePeriod = !cadenceSeconds
        ? 'weekly'
        : cadenceSeconds <= 172800
          ? 'daily'
          : cadenceSeconds <= 1209600
            ? 'weekly'
            : cadenceSeconds <= 5184000
              ? 'monthly'
              : 'yearly'
      const lastBuild = dates.length ? new Date(dates[0]).toUTCString() : undefined
      const channelTitle = xmlEscape(p.frontmatter.title)
      const channelDescription = xmlEscape(
        p.frontmatter.description ?? resolved.site?.description ?? p.frontmatter.title
      )
      const language = resolved.site?.locale?.replace('_', '-').toLowerCase()
      const pageCount = Math.max(1, Math.ceil(entries.length / FEED_PAGE_SIZE))
      for (let index = 0; index < pageCount; index++) {
        const slice = entries.slice(index * FEED_PAGE_SIZE, (index + 1) * FEED_PAGE_SIZE)
        const links: string[] = [
          `<atom:link href="${xmlEscape(`${siteUrl}${feedPath(index)}`)}" rel="self" type="application/rss+xml"/>`
        ]
        if (index > 0) {
          links.push(
            `<atom:link href="${xmlEscape(`${siteUrl}${feedPath(0)}`)}" rel="current" type="application/rss+xml"/>`
          )
        }
        if (index + 1 < pageCount) {
          links.push(
            `<atom:link href="${xmlEscape(`${siteUrl}${feedPath(index + 1)}`)}" rel="prev-archive" type="application/rss+xml"/>`
          )
        }
        if (index > 1) {
          links.push(
            `<atom:link href="${xmlEscape(`${siteUrl}${feedPath(index - 1)}`)}" rel="next-archive" type="application/rss+xml"/>`
          )
        }
        const items = slice.map((e) => {
          const itemUrl = `${pageUrl}#${e.slug}`
          const parts = [
            `<title>${xmlEscape(e.version ? `v${e.version} ${e.title}` : e.title)}</title>`,
            `<link>${xmlEscape(itemUrl)}</link>`,
            `<guid isPermaLink="true">${xmlEscape(itemUrl)}</guid>`
          ]
          if (e.releaseDate) parts.push(`<pubDate>${new Date(e.releaseDate).toUTCString()}</pubDate>`)
          if (e.description) parts.push(`<description>${xmlEscape(e.description)}</description>`)
          if (e.html) parts.push(`<content:encoded>${cdata(e.html)}</content:encoded>`)
          return `    <item>\n      ${parts.join('\n      ')}\n    </item>`
        })
        const channelParts = [
          `<title>${channelTitle}</title>`,
          `<link>${xmlEscape(pageUrl)}</link>`,
          `<description>${channelDescription}</description>`,
          ...links
        ]
        if (language) channelParts.push(`<language>${xmlEscape(language)}</language>`)
        if (lastBuild) channelParts.push(`<lastBuildDate>${lastBuild}</lastBuildDate>`)
        channelParts.push(`<ttl>${ttlMinutes}</ttl>`)
        channelParts.push(`<sy:updatePeriod>${updatePeriod}</sy:updatePeriod>`)
        channelParts.push('<sy:updateFrequency>1</sy:updateFrequency>')
        if (cadenceSeconds !== undefined) {
          channelParts.push(`<nimpress:releaseCadence>${cadenceSeconds}</nimpress:releaseCadence>`)
        }
        channelParts.push(`<nimpress:latestVersion>${xmlEscape(entries[0].version)}</nimpress:latestVersion>`)
        channelParts.push(`<nimpress:releaseCount>${entries.length}</nimpress:releaseCount>`)
        if (index > 0) channelParts.push('<fh:archive/>')
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:sy="http://purl.org/rss/1.0/modules/syndication/" xmlns:fh="http://purl.org/syndication/history/1.0" xmlns:nimpress="${FEED_NAMESPACE}">`,
          '  <channel>',
          `    ${channelParts.join('\n    ')}`,
          items.join('\n'),
          '  </channel>',
          '</rss>'
        ].join('\n')
        feedFiles.set(feedPath(index), xml)
      }
    }
  }

  const gitDateCache = new Map<string, string | undefined>()

  function isGated(p: ProcessedPage): boolean {
    return p.frontmatter.scope !== undefined || p.frontmatter.claim !== undefined
  }

  function publicPages(): ProcessedPage[] {
    const out: ProcessedPage[] = []
    for (const p of pages.values()) {
      if (p.frontmatter.hidden) continue
      if (isGated(p)) continue
      out.push(p)
    }
    return out
  }

  function siteAbsolute(path: string): string | undefined {
    const base = resolved.site?.url?.replace(/\/$/, '')
    if (!base) return undefined
    return base + (path.startsWith('/') ? path : '/' + path)
  }

  function gitLastModified(filePath: string): string | undefined {
    if (gitDateCache.has(filePath)) return gitDateCache.get(filePath)
    let value: string | undefined
    try {
      const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', filePath], {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim()
      value = out || undefined
    } catch {
      value = undefined
    }
    gitDateCache.set(filePath, value)
    return value
  }

  function jsonLdTypeFor(type: PageType): string {
    if (type === 'changelog' || type === 'roadmap') return 'CollectionPage'
    if (type === 'openapi') return 'APIReference'
    if (type === 'hero') return 'WebPage'
    return 'TechArticle'
  }

  function buildPageHead(p: ProcessedPage): string {
    const metaCfg = resolved.meta ?? {}
    const site = resolved.site
    const fm = p.frontmatter
    const fmMeta = fm.meta ?? {}
    const og = fmMeta.og ?? {}
    const tw = fmMeta.twitter ?? {}
    const title = fm.title
    const fullTitle = site?.title && site.title !== title ? `${title} · ${site.title}` : title
    const description = fmMeta.description ?? fm.description ?? site?.description
    const canonical = fmMeta.canonical ?? siteAbsolute(p.effectivePath)
    const keywordList = (() => {
      if (fmMeta.keywords) return Array.isArray(fmMeta.keywords) ? fmMeta.keywords : [fmMeta.keywords]
      const tags = normalizeTags(fm.tags)
      if (tags.length) return tags
      return metaCfg.keywords ?? []
    })()
    const robots = fmMeta.robots ?? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    const ogTitle = og.title ?? title
    const ogDescription = og.description ?? description
    const ogImage = og.image ?? site?.ogImage
    const ogImageAbs = ogImage ? (siteAbsolute(ogImage) ?? ogImage) : undefined
    const ogType = og.type ?? (fm.type === 'hero' || p.effectivePath === '/' ? 'website' : 'article')
    const ogWidth = metaCfg.og?.width ?? 1200
    const ogHeight = metaCfg.og?.height ?? 600
    const twCard = tw.card ?? (ogImageAbs ? 'summary_large_image' : 'summary')
    const twSite = tw.site ?? site?.twitterSite

    const attr = encodeAttr
    const tags: string[] = []
    tags.push(`<title>${attr(fullTitle)}</title>`)
    if (description) tags.push(`<meta name="description" content="${attr(description)}">`)
    if (keywordList.length) tags.push(`<meta name="keywords" content="${attr(keywordList.join(', '))}">`)
    tags.push(`<meta name="robots" content="${attr(robots)}">`)
    tags.push(`<meta name="googlebot" content="${attr(robots)}">`)
    if (canonical) {
      tags.push(`<link rel="canonical" href="${attr(canonical)}">`)
      const locales = metaCfg.localeAlternates ?? []
      for (const locale of locales) {
        tags.push(`<link rel="alternate" hreflang="${attr(locale)}" href="${attr(canonical)}">`)
      }
      if (locales.length) tags.push(`<link rel="alternate" hreflang="x-default" href="${attr(canonical)}">`)
    }
    tags.push(`<meta property="og:title" content="${attr(ogTitle)}">`)
    if (ogDescription) tags.push(`<meta property="og:description" content="${attr(ogDescription)}">`)
    tags.push(`<meta property="og:type" content="${attr(ogType)}">`)
    if (canonical) tags.push(`<meta property="og:url" content="${attr(canonical)}">`)
    if (ogImageAbs) {
      tags.push(`<meta property="og:image" content="${attr(ogImageAbs)}">`)
      tags.push(`<meta property="og:image:width" content="${ogWidth}">`)
      tags.push(`<meta property="og:image:height" content="${ogHeight}">`)
      if (og.imageAlt) tags.push(`<meta property="og:image:alt" content="${attr(og.imageAlt)}">`)
    }
    if (site?.title) tags.push(`<meta property="og:site_name" content="${attr(site.title)}">`)
    if (site?.locale) tags.push(`<meta property="og:locale" content="${attr(site.locale)}">`)
    tags.push(`<meta name="twitter:card" content="${attr(twCard)}">`)
    if (twSite) tags.push(`<meta name="twitter:site" content="${attr(twSite)}">`)
    tags.push(`<meta name="twitter:title" content="${attr(tw.title ?? ogTitle)}">`)
    if (tw.description ?? ogDescription) {
      tags.push(`<meta name="twitter:description" content="${attr(tw.description ?? ogDescription ?? '')}">`)
    }
    if (tw.image ?? ogImageAbs) tags.push(`<meta name="twitter:image" content="${attr(tw.image ?? ogImageAbs ?? '')}">`)
    if (description) tags.push(`<meta name="dc.description" content="${attr(description)}">`)
    tags.push(`<meta name="dc.title" content="${attr(fullTitle)}">`)
    if (site?.locale) tags.push(`<meta name="dc.language" content="${attr(site.locale)}">`)
    if (fm.type === 'changelog' && (fm.rss === true || fm.subscribe === true)) {
      const feedPath = p.effectivePath === '/' ? '/rss.xml' : `${p.effectivePath}/rss.xml`
      const feedHref = siteAbsolute(feedPath) ?? feedPath
      tags.push(`<link rel="alternate" type="application/rss+xml" title="${attr(title)}" href="${attr(feedHref)}">`)
    }

    const siteUrl = resolved.site?.url?.replace(/\/$/, '')
    const graph: unknown[] = []
    if (metaCfg.organization) {
      graph.push({ '@context': 'https://schema.org', ...metaCfg.organization })
    }
    if (siteUrl && site?.title) {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: site.title,
        url: `${siteUrl}/`,
        description: site.description
      })
    }
    if (canonical && p.effectivePath !== '/') {
      const crumbs: { name: string; item?: string }[] = [
        { name: site?.title ?? 'Home', item: siteUrl ? `${siteUrl}/` : undefined }
      ]
      const segments = p.effectivePath.split('/').filter(Boolean)
      let acc = ''
      for (const seg of segments) {
        acc += '/' + seg
        const target = [...pages.values()].find((c) => c.effectivePath === acc)
        crumbs.push({ name: target?.frontmatter.title ?? prettyDirName(seg), item: siteAbsolute(acc) })
      }
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: c.item
        }))
      })
    }
    graph.push({
      '@context': 'https://schema.org',
      '@type': jsonLdTypeFor(p.type),
      name: fullTitle,
      headline: title,
      description,
      url: canonical,
      isPartOf: siteUrl ? `${siteUrl}/#website` : undefined,
      dateModified: gitLastModified(p.filePath)
    })
    if (fmMeta.jsonLd) graph.push(fmMeta.jsonLd)
    for (const entry of graph) tags.push(jsonLdScript(entry))

    return `\n    ${tags.join('\n    ')}\n  `
  }

  function buildRobots(): string {
    const metaCfg = resolved.meta ?? {}
    if (metaCfg.robots?.custom) return metaCfg.robots.custom
    const blocked = new Set(metaCfg.robots?.block ?? [])
    const lines: string[] = ['User-agent: *', 'Allow: /', '']
    for (const agent of CRAWL_AGENTS) {
      lines.push(`User-agent: ${agent}`)
      lines.push(blocked.has(agent) ? 'Disallow: /' : 'Allow: /')
      lines.push('')
    }
    for (const agent of blocked) {
      if (CRAWL_AGENTS.includes(agent)) continue
      lines.push(`User-agent: ${agent}`)
      lines.push('Disallow: /')
      lines.push('')
    }
    if (metaCfg.robots?.append) lines.push(metaCfg.robots.append, '')
    const sitemap = siteAbsolute('/sitemap.xml')
    if (sitemap) lines.push(`Sitemap: ${sitemap}`)
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
  }

  function buildSitemap(list: ProcessedPage[]): string | undefined {
    const siteUrl = resolved.site?.url?.replace(/\/$/, '')
    if (!siteUrl) return undefined
    const locales = resolved.meta?.localeAlternates ?? []
    const urls = list.map((p) => {
      const loc = `${siteUrl}${p.effectivePath === '/' ? '/' : p.effectivePath}`
      const depth = p.effectivePath.split('/').filter(Boolean).length
      const priority = depth === 0 ? '1.0' : depth === 1 ? '0.8' : '0.6'
      const changefreq = depth === 0 ? 'weekly' : 'monthly'
      const lastmod = gitLastModified(p.filePath)
      const parts = [`    <loc>${xmlEscape(loc)}</loc>`]
      if (lastmod) parts.push(`    <lastmod>${xmlEscape(lastmod)}</lastmod>`)
      parts.push(`    <changefreq>${changefreq}</changefreq>`)
      parts.push(`    <priority>${priority}</priority>`)
      for (const locale of locales) {
        parts.push(`    <xhtml:link rel="alternate" hreflang="${xmlEscape(locale)}" href="${xmlEscape(loc)}"/>`)
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      urls.join('\n'),
      '</urlset>',
      ''
    ].join('\n')
  }

  function buildLlms(list: ProcessedPage[]): string {
    const metaCfg = resolved.meta ?? {}
    const site = resolved.site
    const lines: string[] = [`# ${site?.title ?? resolved.title}`, '']
    const summary = metaCfg.llms?.summary ?? site?.description
    if (summary) lines.push(`> ${summary}`, '')
    const sections = new Map<string, ProcessedPage[]>()
    const rootPages: ProcessedPage[] = []
    for (const p of list) {
      const segments = p.effectivePath.split('/').filter(Boolean)
      if (segments.length === 0) {
        rootPages.push(p)
        continue
      }
      const key = segments[0]
      const group = sections.get(key) ?? []
      group.push(p)
      sections.set(key, group)
    }
    const lineFor = (p: ProcessedPage): string => {
      const url = siteAbsolute(p.effectivePath) ?? p.effectivePath
      return p.frontmatter.description
        ? `- [${p.frontmatter.title}](${url}): ${p.frontmatter.description}`
        : `- [${p.frontmatter.title}](${url})`
    }
    for (const p of rootPages) lines.push(lineFor(p))
    if (rootPages.length) lines.push('')
    for (const [segment, group] of [...sections.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const index = group.find((p) => p.effectivePath === `/${segment}`)
      lines.push(`## ${index?.frontmatter.title ?? prettyDirName(segment)}`, '')
      group.sort((a, b) => a.effectivePath.localeCompare(b.effectivePath))
      for (const p of group) lines.push(lineFor(p))
      lines.push('')
    }
    const keywords = new Set<string>(resolved.meta?.keywords ?? [])
    for (const p of list) for (const t of normalizeTags(p.frontmatter.tags)) keywords.add(t)
    if (keywords.size) {
      lines.push('## Keywords', '', [...keywords].join(', '), '')
    }
    const sitemap = siteAbsolute('/sitemap.xml')
    const robots = siteAbsolute('/robots.txt')
    if (sitemap || robots) {
      lines.push('## Optional', '')
      if (sitemap) lines.push(`- [Sitemap](${sitemap})`)
      if (robots) lines.push(`- [Robots](${robots})`)
      lines.push('')
    }
    if (metaCfg.llms?.append) lines.push(metaCfg.llms.append, '')
    return lines.join('\n').replace(/\n{3,}/g, '\n\n')
  }

  function buildLlmsFull(list: ProcessedPage[]): string {
    const site = resolved.site
    const lines: string[] = [`# ${site?.title ?? resolved.title}`, '']
    for (const p of list) {
      lines.push(`## ${p.frontmatter.title}`, '')
      const url = siteAbsolute(p.effectivePath)
      if (url) lines.push(`URL: ${url}`, '')
      lines.push(p.rawText.trim(), '')
    }
    return lines.join('\n').replace(/\n{3,}/g, '\n\n')
  }

  async function writeStaticArtifacts(): Promise<void> {
    const metaCfg = resolved.meta ?? {}
    const list = publicPages().sort((a, b) => a.effectivePath.localeCompare(b.effectivePath))
    const shellPath = join(resolvedOutDir, 'index.html')
    const shell = await readFile(shellPath, 'utf-8')
    for (const p of list) {
      const head = buildPageHead(p)
      const html = shell.replace('</head>', `${head}</head>`)
      const target = p.effectivePath === '/'
        ? shellPath
        : join(resolvedOutDir, p.effectivePath.replace(/^\//, ''), 'index.html')
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, html)
    }
    await writeFile(join(resolvedOutDir, 'robots.txt'), buildRobots())
    const sitemap = buildSitemap(list)
    if (sitemap) await writeFile(join(resolvedOutDir, 'sitemap.xml'), sitemap)
    await writeFile(join(resolvedOutDir, 'llms.txt'), buildLlms(list))
    if (metaCfg.llms?.full) {
      await writeFile(join(resolvedOutDir, 'llms-full.txt'), buildLlmsFull(list))
    }
    if (metaCfg.webmanifest) {
      await writeFile(join(resolvedOutDir, 'site.webmanifest'), JSON.stringify(metaCfg.webmanifest, null, 2) + '\n')
    }
    if (metaCfg.humans) {
      await writeFile(join(resolvedOutDir, 'humans.txt'), metaCfg.humans.trim() + '\n')
    }
    if (metaCfg.security) {
      const s = metaCfg.security
      const lines: string[] = []
      if (s.contact) lines.push(`Contact: ${s.contact}`)
      if (s.policy) lines.push(`Policy: ${s.policy}`)
      if (s.languages) lines.push(`Preferred-Languages: ${s.languages}`)
      if (s.canonical) lines.push(`Canonical: ${s.canonical}`)
      if (s.expires) lines.push(`Expires: ${s.expires}`)
      if (lines.length) {
        await mkdir(join(resolvedOutDir, '.well-known'), { recursive: true })
        await writeFile(join(resolvedOutDir, '.well-known', 'security.txt'), lines.join('\n') + '\n')
      }
    }
  }

  async function writeGatedArtifacts(): Promise<void> {
    const gated = [...pages.values()].filter((p) => !p.frontmatter.hidden && isGated(p))
    const accessRoutes: Record<string, { scope?: string; claim?: string }> = {}
    for (const p of gated) {
      accessRoutes[p.effectivePath] = { scope: p.frontmatter.scope, claim: p.frontmatter.claim }
    }
    await writeFile(
      join(resolvedOutDir, 'access.json'),
      JSON.stringify({ prefix: '/_gated/', routes: accessRoutes }, null, 2) + '\n'
    )
    if (gated.length === 0) return
    const dir = join(resolvedOutDir, '_gated')
    await mkdir(join(dir, 'body'), { recursive: true })
    const styles: Record<string, string> = {}
    const shells = gated.map((p) => ({
      slug: p.slug,
      path: p.effectivePath,
      type: p.type,
      frontmatter: p.frontmatter
    }))
    for (const p of gated) {
      if (p.pageCss) styles[p.effectivePath] = p.pageCss
      const body = {
        html: p.html,
        headings: p.headings,
        openApiSpec: p.openApiSpec,
        changelogEntries: p.changelogEntries,
        roadmapEntries: p.roadmapEntries,
        componentData: p.componentData
      }
      const bodyFile = join(dir, 'body', `${urlSlug(p.slug)}.json`)
      await mkdir(dirname(bodyFile), { recursive: true })
      await writeFile(bodyFile, JSON.stringify(body))
    }
    await writeFile(
      join(dir, 'manifest.json'),
      JSON.stringify({ shells, styles, sidebar: buildSidebar(true) })
    )
    await writeFile(join(dir, 'search.json'), JSON.stringify(buildSearch(true)))
  }

  function attachRoadmapEntries(
    roadmapGroups: Map<string, ProcessedPage[]>,
    allProcessed: ProcessedPage[]
  ): void {
    if (roadmapGroups.size === 0) return
    const issuePages = allProcessed.filter((p) => isIssueType(p.type))
    const issueByFilePath = new Map<string, ProcessedPage>()
    for (const p of issuePages) issueByFilePath.set(p.filePath, p)

    for (const [, group] of roadmapGroups) {
      const roadmapPage = group[0]
      const roadmapDir = dirname(roadmapPage.filePath)
      const data = roadmapPage.frontmatter.data as Record<string, unknown> | undefined
      const scopeOverride = data?.issues ?? data?.entries
      const issueScopes: string[] = []
      if (typeof scopeOverride === 'string') issueScopes.push(scopeOverride)
      else if (Array.isArray(scopeOverride)) {
        for (const s of scopeOverride) if (typeof s === 'string') issueScopes.push(s)
      }
      const scopedDirs = issueScopes.length
        ? issueScopes.map((s) => resolve(roadmapDir, s))
        : [roadmapDir]
      const scoped = issuePages.filter((p) => {
        for (const dir of scopedDirs) {
          if (p.filePath === dir) continue
          if (p.filePath.startsWith(dir + '/') || p.filePath.startsWith(dir + '\\')) return true
        }
        return false
      })

      const changelogScope = data?.changelog
      const changelogScopeDirs: string[] = []
      if (typeof changelogScope === 'string') {
        changelogScopeDirs.push(resolve(roadmapDir, changelogScope))
      } else if (Array.isArray(changelogScope)) {
        for (const s of changelogScope) if (typeof s === 'string') {
          changelogScopeDirs.push(resolve(roadmapDir, s))
        }
      }

      const refsByIssue = new Map<string, RoadmapChangelogRef[]>()
      for (const p of allProcessed) {
        if (p.type !== 'changelog') continue
        if (changelogScopeDirs.length) {
          const inScope = changelogScopeDirs.some(
            (d) => p.filePath === d || p.filePath.startsWith(d + '/') || p.filePath.startsWith(d + '\\')
          )
          if (!inScope) continue
        }
        const cd = p.frontmatter.data as Record<string, unknown> | undefined
        const issueRef = cd?.issue
        if (!issueRef) continue
        const issueRefStr = String(issueRef).trim()
        if (!issueRefStr) continue
        const resolvedIssueFile = resolveRelativeFile(p.filePath, issueRefStr)
        if (!resolvedIssueFile) continue
        const target = issueByFilePath.get(resolvedIssueFile)
        if (!target) continue
        const version = String(cd?.version ?? '')
        const releaseDate = readDateField(cd?.release_date)
        const rawStatus = cd?.status
        let progress: number | undefined
        let completes = false
        if (typeof rawStatus === 'string') {
          const trimmed = rawStatus.trim().toLowerCase()
          if (['completes', 'completed', 'complete', 'fixes', 'closes', 'resolves'].includes(trimmed)) {
            completes = true
          } else {
            const n = Number(trimmed.replace(/%$/, ''))
            if (Number.isFinite(n)) progress = n
          }
        } else if (typeof rawStatus === 'number') {
          progress = rawStatus
        }
        const list = refsByIssue.get(target.filePath) ?? []
        list.push({
          version,
          title: String(cd?.title ?? p.frontmatter.title),
          description: cd?.description !== undefined ? String(cd.description) : undefined,
          releaseDate,
          progress,
          completes,
          path: p.effectivePath,
          slug: version ? `v${version}` : 'unreleased',
          entrySlug: `${p.effectivePath}#${version ? `v${version}` : 'unreleased'}`
        })
        refsByIssue.set(target.filePath, list)
      }

      const built: RoadmapEntry[] = scoped.map((e) => {
        const ed = e.frontmatter.data as Record<string, unknown> | undefined
        const kind = (e.type as RoadmapKind)
        const targetDate = readDateField(ed?.date ?? ed?.target_date)
        let parent: string | undefined
        const rawParent = ed?.parent
        if (typeof rawParent === 'string' && rawParent.trim()) {
          const resolvedParent = resolveRelativeFile(e.filePath, rawParent.trim())
          if (resolvedParent && issueByFilePath.has(resolvedParent)) {
            parent = issueByFilePath.get(resolvedParent)!.effectivePath
          }
        }
        const refs = (refsByIssue.get(e.filePath) ?? []).slice().sort(
          (a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '')
        )
        const shipped = refs.some((r) => r.completes)
        const explicitStatus = String(ed?.status ?? '').toLowerCase()
        const status: RoadmapStatus =
          explicitStatus === 'shipped' || explicitStatus === 'in_progress' || explicitStatus === 'planned'
            ? (explicitStatus as RoadmapStatus)
            : shipped ? 'shipped' : refs.length ? 'in_progress' : 'planned'
        const maxProgress = refs.reduce<number | undefined>((acc, r) => {
          if (typeof r.progress === 'number') return Math.max(acc ?? 0, r.progress)
          return acc
        }, undefined)
        return {
          kind,
          slug: e.slug,
          filePath: e.filePath,
          href: e.effectivePath,
          title: e.frontmatter.title,
          description: e.frontmatter.description,
          targetDate,
          parent,
          progress: maxProgress,
          status,
          hidden: e.frontmatter.hidden,
          html: e.html,
          headings: e.headings,
          data: e.frontmatter.data,
          changelog: refs
        }
      })
      built.sort((a, b) => (a.targetDate ?? '').localeCompare(b.targetDate ?? ''))
      roadmapPage.roadmapEntries = built
      roadmapPage.headings = built.map((e) => ({
        level: 2,
        text: e.title,
        slug: e.slug
      }))
    }
  }

  function isIssueType(t: PageType): boolean {
    return t === 'milestone' || t === 'epic' || t === 'feature' || t === 'bug'
  }

  function resolveRelativeFile(fromFile: string, ref: string): string | null {
    const base = dirname(fromFile)
    const cleaned = ref.replace(/\\/g, '/').trim()
    const withExt = cleaned.endsWith('.md') ? cleaned : `${cleaned}.md`
    return resolve(base, withExt)
  }

  function readDateField(raw: unknown): string | undefined {
    if (raw === undefined || raw === null) return undefined
    if (raw instanceof Date) return raw.toISOString()
    const str = String(raw).trim()
    if (!str) return undefined
    const parsed = new Date(str)
    if (Number.isNaN(parsed.getTime())) return undefined
    return parsed.toISOString()
  }

  function readNumber(raw: unknown): number | undefined {
    if (typeof raw === 'number') return raw
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw)
      return Number.isFinite(n) ? n : undefined
    }
    return undefined
  }

  function buildSidebar(includeGated = false): SidebarNode[] {
    interface TreeNode {
      segment: string
      fullPath: string
      page?: ProcessedPage
      children: Map<string, TreeNode>
    }

    const root: TreeNode = { segment: '', fullPath: '', children: new Map() }
    const dirMeta = new Map<string, { label?: string; icon?: string; style?: string }>()

    for (const p of pages.values()) {
      if (isBuildCommand && (p.frontmatter.hidden || (!includeGated && isGated(p)))) continue
      if (p.effectivePath === '/') continue
      const segments = p.effectivePath.split('/').filter(Boolean)
      const group = p.frontmatter.group
      if (group?.name && segments[segments.length - 2] !== group.name) {
        if (segments.length >= 3) segments.splice(segments.length - 2, 1, group.name)
        else segments.splice(segments.length - 1, 0, group.name)
      }
      let cursor = root
      let acc = ''
      for (const seg of segments) {
        acc = acc + '/' + seg
        let next = cursor.children.get(seg)
        if (!next) {
          next = { segment: seg, fullPath: acc, children: new Map() }
          cursor.children.set(seg, next)
        }
        cursor = next
      }
      cursor.page = p
      if (group?.name) {
        const target = '/' + segments.slice(0, -1).join('/')
        dirMeta.set(target, {
          label: group.name,
          icon: group.icon ?? dirMeta.get(target)?.icon,
          style: group.style ?? dirMeta.get(target)?.style
        })
      }
    }

    function emit(t: TreeNode): SidebarNode {
      const items: SidebarNode[] = []
      for (const child of t.children.values()) items.push(emit(child))
      sortNodes(items)

      if (t.page) {
        const node: SidebarNode = {
          text: pageLabel(t.page),
          link: t.page.effectivePath,
          slug: t.page.slug,
          scope: t.page.frontmatter.scope,
          claim: t.page.frontmatter.claim,
          icon: t.page.frontmatter.icon,
          order: t.page.frontmatter.order,
          collapsed: t.page.frontmatter.collapsed,
          hidden: t.page.frontmatter.hidden
        }
        const flat = t.page.openApiSpec as { tags?: { name: string }[] } | undefined
        if (t.page.type === 'openapi' && flat?.tags?.length) {
          const tagNodes: SidebarNode[] = flat.tags.map((tag) => ({
            text: tag.name,
            link: `${t.page!.effectivePath}#tag/${tag.name}`,
            slug: `${t.page!.slug}__tag__${tag.name}`
          }))
          node.items = [...tagNodes, ...items]
        } else if (t.page.type === 'changelog' && t.page.changelogEntries?.length) {
          const versionNodes: SidebarNode[] = t.page.changelogEntries.map((e, idx) => ({
            text: e.version ? `v${e.version}` : (e.title || 'unreleased'),
            link: `${t.page!.effectivePath}#${e.slug}`,
            slug: `${t.page!.slug}__${e.slug}`,
            hidden: e.hidden,
            order: idx
          }))
          node.items = items.length ? [...versionNodes, ...items] : versionNodes
        } else if (t.page.type === 'roadmap' && t.page.roadmapEntries?.length) {
          const entries = t.page.roadmapEntries.slice().sort(
            (a, b) => (a.targetDate ?? '').localeCompare(b.targetDate ?? '')
          )
          const byHref = new Map(entries.map((e) => [e.href, e]))
          const childrenOf = new Map<string, typeof entries>()
          const roots: typeof entries = []
          for (const e of entries) {
            if (e.parent && byHref.has(e.parent)) {
              const list = childrenOf.get(e.parent) ?? []
              list.push(e)
              childrenOf.set(e.parent, list)
            } else {
              roots.push(e)
            }
          }
          const buildEntryNode = (e: typeof entries[number], idx: number): SidebarNode => {
            const kids = childrenOf.get(e.href) ?? []
            const node: SidebarNode = {
              text: e.title,
              link: e.href,
              slug: e.slug,
              icon: e.kind,
              hidden: e.hidden,
              order: idx
            }
            if (kids.length) node.items = kids.map((k, i) => buildEntryNode(k, i))
            return node
          }
          const entryNodes = roots.map((e, idx) => buildEntryNode(e, idx))
          const filteredItems = items.filter((it) => !it.slug || !entries.some((e) => e.slug === it.slug))
          node.items = filteredItems.length ? [...entryNodes, ...filteredItems] : entryNodes
        } else if (t.page.type === 'component') {
          const docNode: SidebarNode = {
            text: 'Overview',
            link: t.page.effectivePath,
            slug: `${t.page.slug}__doc`,
            order: -1
          }
          const storyNodes: SidebarNode[] = (t.page.componentData?.stories ?? []).map((story, idx) => ({
            text: story.name,
            link: `${t.page!.effectivePath}/${storyAnchor(story.name)}`,
            slug: `${t.page!.slug}__story__${storyAnchor(story.name)}`,
            order: idx
          }))
          node.text = prettyDirName(t.segment)
          node.items = [docNode, ...storyNodes, ...items]
          node.collapsed = true
        } else if (items.length) {
          node.items = items
        }
        if (node.collapsed !== false && node.items?.some((it) => it.collapsed === false)) {
          node.collapsed = false
        }
        return node
      }

      const meta = dirMeta.get(t.fullPath)
      const node: SidebarNode = {
        text: meta?.label ?? prettyDirName(t.segment),
        slug: t.fullPath.replace(/^\//, '')
      }
      if (meta?.icon) node.icon = meta.icon
      if (meta?.style) node.style = meta.style
      if (items.length) {
        node.items = items
        let minOrder = Number.MAX_SAFE_INTEGER
        for (const it of items) {
          if (it.order !== undefined && it.order < minOrder) minOrder = it.order
        }
        if (minOrder !== Number.MAX_SAFE_INTEGER) node.order = minOrder
      }
      if (node.items?.some((it) => it.collapsed === false)) {
        node.collapsed = false
      }
      return node
    }

    const roots: SidebarNode[] = []
    for (const child of root.children.values()) roots.push(emit(child))
    sortNodes(roots)
    return roots
  }

  function buildManifest() {
    const pageMap: Record<string, PageMeta> = {}
    const byPath: Record<string, string> = {}

    for (const [slug, p] of pages) {
      if (isBuildCommand && (p.frontmatter.hidden || isGated(p))) continue
      const meta: PageMeta = {
        slug,
        path: p.effectivePath,
        type: p.type,
        title: p.frontmatter.title,
        scope: p.frontmatter.scope,
        claim: p.frontmatter.claim,
        description: p.frontmatter.description,
        order: p.frontmatter.order,
        hidden: p.frontmatter.hidden,
        redirect: p.frontmatter.redirect,
        meta: p.frontmatter.meta
      }
      pageMap[slug] = meta
      byPath[p.effectivePath] = slug
      if (p.type === 'component') {
        for (const story of p.componentData?.stories ?? []) {
          byPath[`${p.effectivePath}/${storyAnchor(story.name)}`] = slug
        }
      }
    }

    const styles: Record<string, string> = {}
    for (const p of pages.values()) {
      if (isBuildCommand && (p.frontmatter.hidden || isGated(p))) continue
      if (p.pageCss) styles[p.effectivePath] = p.pageCss
    }

    return { pages: pageMap, byPath, sidebar: buildSidebar(), styles }
  }

  function buildSearch(gatedOnly = false): SearchEntry[] {
    const out: SearchEntry[] = []
    for (const [slug, p] of pages) {
      if (gatedOnly) {
        if (p.frontmatter.hidden || !isGated(p)) continue
      } else if (isBuildCommand && (p.frontmatter.hidden || isGated(p))) continue
      const baseBody = p.rawText.replace(/```[\s\S]*?```/g, '').replace(/[#*`>_\[\]\(\)]/g, ' ')
      const specBody = p.type === 'openapi' ? extractOpenApiText(p.openApiSpec) : ''
      const roadmapBody = p.type === 'roadmap' ? extractRoadmapText(p.roadmapEntries ?? []) : ''
      const componentBody = p.componentData
        ? [
            p.componentData.component,
            p.componentData.system,
            ...(p.componentData.stories ?? []).flatMap((story) => [story.name, story.file])
          ]
            .filter(Boolean)
            .join(' ')
        : ''
      const body = [baseBody, specBody, roadmapBody, componentBody].filter(Boolean).join(' \n ')
      out.push({
        slug,
        path: p.effectivePath,
        title: p.frontmatter.title,
        description: p.frontmatter.description,
        body,
        scope: p.frontmatter.scope,
        claim: p.frontmatter.claim,
        headings: p.headings.map((h) => h.text),
        tags: [
          ...normalizeTags(p.frontmatter.tags),
          ...(p.componentData ? [p.componentData.component] : [])
        ]
      })
    }
    return out
  }

  function stripHtml(html: string | undefined): string {
    if (!html) return ''
    return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ')
  }

  function extractOpenApiText(spec: unknown): string {
    if (!spec || typeof spec !== 'object') return ''
    const flat = spec as {
      title?: string
      description?: string
      tags?: { name?: string; description?: string; operations?: unknown[] }[]
      schemas?: Record<string, unknown>
      servers?: { url?: string; description?: string }[]
      securitySchemes?: Record<string, unknown>
    }
    const parts: string[] = []
    const seen = new WeakSet<object>()
    const MAX_DEPTH = 12

    const harvest = (value: unknown, depth: number) => {
      if (value === null || value === undefined) return
      if (depth > MAX_DEPTH) return
      const t = typeof value
      if (t === 'string') {
        const s = (value as string).trim()
        if (s) parts.push(s)
        return
      }
      if (t === 'number' || t === 'boolean') {
        parts.push(String(value))
        return
      }
      if (t !== 'object') return
      if (seen.has(value as object)) return
      seen.add(value as object)
      if (Array.isArray(value)) {
        for (const item of value) harvest(item, depth + 1)
        return
      }
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (key === 'description_html' || key === 'summary_html' || key === 'requestBodyHtml') {
          if (typeof child === 'string') parts.push(stripHtml(child))
          continue
        }
        parts.push(key)
        harvest(child, depth + 1)
      }
    }

    if (flat.title) parts.push(flat.title)
    if (flat.description) parts.push(flat.description)
    for (const s of flat.servers ?? []) {
      if (s.url) parts.push(s.url)
      if (s.description) parts.push(s.description)
    }
    for (const [name, scheme] of Object.entries(flat.securitySchemes ?? {})) {
      parts.push(name)
      harvest(scheme, 0)
    }
    for (const tag of flat.tags ?? []) {
      if (tag.name) parts.push(tag.name)
      if (tag.description) parts.push(tag.description)
      for (const op of tag.operations ?? []) {
        const o = op as { method?: string }
        if (o.method) parts.push(o.method.toLowerCase(), o.method.toUpperCase())
        harvest(op, 0)
      }
    }
    for (const [name, schema] of Object.entries(flat.schemas ?? {})) {
      parts.push(name)
      harvest(schema, 0)
    }
    return parts.join(' \n ')
  }

  function extractRoadmapText(entries: RoadmapEntry[]): string {
    const parts: string[] = []
    for (const e of entries) {
      parts.push(e.slug, e.kind, e.title)
      if (e.description) parts.push(e.description)
      if (e.targetDate) parts.push(e.targetDate)
      if (e.html) parts.push(stripHtml(e.html))
      for (const ref of e.changelog) {
        parts.push(ref.version, ref.title)
        if (ref.description) parts.push(ref.description)
        if (ref.releaseDate) parts.push(ref.releaseDate)
      }
    }
    return parts.join(' \n ')
  }

  function normalizeTags(raw: string | string[] | undefined): string[] {
    if (!raw) return []
    const parts = Array.isArray(raw) ? raw : String(raw).split(',')
    const out: string[] = []
    for (const part of parts) {
      const trimmed = String(part).trim()
      if (trimmed) out.push(trimmed)
    }
    return out
  }

  function urlSlug(slug: string): string {
    return slug === '' ? '__root__' : slug
  }

  function fromUrlSlug(safe: string): string {
    return safe === '__root__' ? '' : safe
  }

  function invalidateMeta(dev: ViteDevServer): void {
    for (const id of [VIRTUAL_MANIFEST, VIRTUAL_SEARCH, VIRTUAL_PAGES, VIRTUAL_BODIES]) {
      const m = dev.moduleGraph.getModuleById('\0' + id)
      if (m) dev.moduleGraph.invalidateModule(m)
    }
  }

  function invalidateAllBodies(dev: ViteDevServer): void {
    for (const slug of pages.keys()) {
      const bodyId = '\0' + PAGE_BODY_PREFIX + urlSlug(slug) + '.js'
      const compId = '\0' + PAGE_COMPONENT_PREFIX + urlSlug(slug) + '.svelte'
      const b = dev.moduleGraph.getModuleById(bodyId)
      const c = dev.moduleGraph.getModuleById(compId)
      if (b) dev.moduleGraph.invalidateModule(b)
      if (c) dev.moduleGraph.invalidateModule(c)
    }
  }

  function buildPagesEntry(): string {
    const entries: string[] = []
    for (const [slug, p] of pages) {
      if (isBuildCommand && (p.frontmatter.hidden || isGated(p))) continue
      const id = `${PAGE_COMPONENT_PREFIX}${urlSlug(slug)}.svelte`
      entries.push(`  ${JSON.stringify(slug)}: () => import(${JSON.stringify(id)})`)
    }
    return `export const pages = {\n${entries.join(',\n')}\n}\nexport default pages\n`
  }

  function buildBodiesEntry(): string {
    const entries: string[] = []
    for (const [slug, p] of pages) {
      if (isBuildCommand && (p.frontmatter.hidden || isGated(p))) continue
      const id = `${PAGE_BODY_PREFIX}${urlSlug(slug)}.js`
      entries.push(`  ${JSON.stringify(slug)}: () => import(${JSON.stringify(id)})`)
    }
    return `export const bodies = {\n${entries.join(',\n')}\n}\nexport default bodies\n`
  }

  function buildPageBody(slug: string): string | null {
    const p = pages.get(slug)
    if (!p) return null
    const payload = {
      html: p.html,
      headings: p.headings,
      openApiSpec: p.openApiSpec,
      changelogEntries: p.changelogEntries,
      roadmapEntries: p.roadmapEntries,
      componentData: p.componentData
    }
    return `export default ${JSON.stringify(payload)}\n`
  }

  function buildPageComponent(slug: string): string | null {
    const p = pages.get(slug)
    if (!p) return null
    const shell = {
      slug: p.slug,
      path: p.effectivePath,
      type: p.type,
      frontmatter: p.frontmatter
    }
    const bodyId = `${PAGE_BODY_PREFIX}${urlSlug(slug)}.js`
    const json = JSON.stringify(shell).replace(/<\/script>/g, '<\\/script>')
    return `<script lang="ts">
  import { Page, OpenApiRoot, ChangelogPage, HeroPage, RoadmapPage, ComponentPage, setPageMeta, applyPageStyles } from '@nimling/nimpress'
  import type { PageBody } from '@nimling/nimpress'
  const shell = ${json}
  setPageMeta(shell)
  applyPageStyles(shell.path)
  const bodyPromise: Promise<{ default: PageBody }> = import(${JSON.stringify(bodyId)})
</script>

{#if shell.type === 'hero'}
  <HeroPage page={shell} {bodyPromise} />
{:else}
  {#await bodyPromise}
    <div class="np-page-loading" aria-busy="true"></div>
  {:then mod}
    {#if shell.type === 'openapi' && mod.default.openApiSpec}
      <OpenApiRoot spec={mod.default.openApiSpec} title={shell.frontmatter.title} frontmatter={shell.frontmatter} />
    {:else if shell.type === 'changelog'}
      <ChangelogPage page={{ ...shell, ...mod.default }} />
    {:else if shell.type === 'roadmap'}
      <RoadmapPage page={{ ...shell, ...mod.default }} />
    {:else if shell.type === 'component'}
      <ComponentPage page={{ ...shell, ...mod.default }} />
    {:else}
      <Page page={{ ...shell, ...mod.default }} />
    {/if}
  {:catch err}
    <div class="np-page-error">Failed to load page body: {String(err)}</div>
  {/await}
{/if}
`
  }

  return {
    name: '@nimling/nimpress:markdown',

    async config() {
      const loaded = await loadNimpressConfig(process.cwd(), inline)
      resolved = loaded.resolved
      contentRoot = resolve(process.cwd(), resolved.contentDir)
      assetsRoot = resolve(process.cwd(), resolved.assetsDir)
      return {}
    },

    configResolved(config) {
      isBuildCommand = config.command === 'build'
      resolvedOutDir = resolve(config.root, config.build.outDir)
    },

    async buildStart() {
      await processAll()
    },

    async closeBundle() {
      if (!isBuildCommand) return
      const src = join(resolvedOutDir, 'index.html')
      const dest = join(resolvedOutDir, '404.html')
      await copyFile(src, dest)
      if (existsSync(contentRoot)) {
        await cp(contentRoot, resolvedOutDir, {
          recursive: true,
          filter: (s) => {
            try {
              return statSync(s).isDirectory() || !(s.endsWith('.md') || s.endsWith('.css'))
            } catch {
              return false
            }
          }
        })
      }
      if (existsSync(assetsRoot)) {
        const target = join(resolvedOutDir, resolved.assetUrlBase.replace(/^\//, ''))
        await cp(assetsRoot, target, { recursive: true })
      }
      for (const [urlPath, xml] of feedFiles) {
        const target = join(resolvedOutDir, urlPath.replace(/^\//, ''))
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, xml)
      }
      await writeStaticArtifacts()
      await writeGatedArtifacts()
    },

    configureServer(devServer) {
      server = devServer
      devServer.watcher.add(contentRoot)
      devServer.watcher.add(assetsRoot)
      for (const specPath of trackedSpecs) devServer.watcher.add(specPath)
      for (const componentPath of trackedComponents) devServer.watcher.add(componentPath)

      const onAdd = async (file: string) => {
        const underContent = file.startsWith(contentRoot)
        if (!underContent || !(file.endsWith('.md') || file.endsWith('.css') || file.endsWith('.story.ts'))) return
        if (file.endsWith('.css')) dropFileCache(file.replace(/\.css$/, '.md'))
        if (file.endsWith('.story.ts')) dropFileCache(join(dirname(file), 'index.md'))
        try {
          await processAll()
        } catch (err) {
          devServer.config.logger.error(String(err))
          return
        }
        invalidateMeta(devServer)
        invalidateAllBodies(devServer)
        devServer.ws.send({ type: 'full-reload' })
      }
      const onUnlink = async (file: string) => {
        const underContent = file.startsWith(contentRoot)
        if (underContent && (file.endsWith('.md') || file.endsWith('.css') || file.endsWith('.story.ts'))) {
          if (file.endsWith('.story.ts')) dropFileCache(join(dirname(file), 'index.md'))
          else dropFileCache(file.endsWith('.css') ? file.replace(/\.css$/, '.md') : file)
          try {
            await processAll()
          } catch (err) {
            devServer.config.logger.error(String(err))
            return
          }
          invalidateMeta(devServer)
          invalidateAllBodies(devServer)
          devServer.ws.send({ type: 'full-reload' })
          return
        }
        if (specToMd.has(file)) {
          const mdFile = specToMd.get(file)!
          dropFileCache(mdFile)
        }
        if (componentToMd.has(file)) {
          dropFileCache(componentToMd.get(file)!)
        }
      }
      devServer.watcher.on('add', onAdd)
      devServer.watcher.on('unlink', onUnlink)

      if (resolved.banner !== false) {
        const consumer = readConsumerPackage()
        const userBanner = resolved.banner
        const startedAt = Date.now()
        devServer.printUrls = function () {
          const urls = devServer.resolvedUrls
          const local = urls?.local?.[0] ?? `http://localhost:${devServer.config.server.port ?? 5173}/`
          const network = urls?.network?.[0] ?? 'use --host to expose'
          const banner = buildBanner({
            title: userBanner.title ?? resolved.title ?? consumer.name ?? 'Nimpress',
            tagline: userBanner.tagline,
            company: userBanner.company,
            version: userBanner.version ?? consumer.version,
            localUrl: local,
            networkUrl: network,
            duration: Date.now() - startedAt
          })
          process.stdout.write('\x1Bc')
          process.stdout.write(banner + '\n')
        }
      }

      const mimes: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
        '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.json': 'application/json',
        '.css': 'text/css', '.js': 'text/javascript', '.txt': 'text/plain',
        '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4'
      }
      const base = resolved.assetUrlBase

      const serveFile = (root: string, rel: string, res: import('node:http').ServerResponse): boolean => {
        if (!rel || rel.endsWith('.md')) return false
        const file = join(root, decodeURIComponent(rel))
        if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return false
        res.setHeader('Content-Type', mimes[extname(file).toLowerCase()] ?? 'application/octet-stream')
        createReadStream(file).pipe(res)
        return true
      }

      devServer.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        if (url.startsWith('/@') || url.startsWith('/node_modules/')) return next()
        if (url === '/__nimpress/claude-md' && req.method === 'PUT') {
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { path?: string; content?: string }
              const rel = String(body.path ?? '')
              const content = String(body.content ?? '')
              const target = resolve(process.cwd(), rel)
              const roots = Object.values(resolved.modules.systems)
                .filter((s) => s.source)
                .map((s) => resolve(process.cwd(), s.source!))
              const inRoot = roots.some((r) => target.startsWith(r + sep))
              if (!inRoot || !target.endsWith(`${sep}CLAUDE.md`) || !existsSync(dirname(target))) {
                res.statusCode = 403
                res.end('invalid claude-md target')
                return
              }
              await writeFile(target, content)
              dropFileCache(componentToMd.get(target) ?? '')
              res.statusCode = 204
              res.end()
            } catch (err) {
              res.statusCode = 400
              res.end(String(err))
            }
          })
          return
        }
        const feed = feedFiles.get(url)
        if (feed !== undefined) {
          res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
          res.end(feed)
          return
        }
        const modulesRoute = resolved.modules.route.replace(/\/$/, '')
        if (url === modulesRoute || url.startsWith(modulesRoute + '/')) {
          const rest = url.slice(modulesRoute.length).replace(/^\/+/, '')
          const system = decodeURIComponent(rest.split('/')[0] ?? '')
          const systemConfig = resolved.modules.systems[system]
          if (!systemConfig) {
            res.statusCode = 404
            res.end(`unknown module system: ${system}`)
            return
          }
          const upstream = httpRequest(
            {
              host: '127.0.0.1',
              port: harnessPort(resolved.modules, system),
              path: req.url ?? '/',
              method: req.method,
              headers: req.headers
            },
            (upstreamRes) => {
              res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers)
              upstreamRes.pipe(res)
            }
          )
          upstream.on('error', () => {
            res.statusCode = 503
            res.setHeader('Content-Type', 'text/html')
            res.end(
              `<!doctype html><html><body style="font-family:monospace;padding:2rem"><p>module harness for <b>${system}</b> is not running.</p><p>start it with: <code>nimpress modules dev ${system}</code></p></body></html>`
            )
          })
          req.pipe(upstream)
          return
        }
        const baseMatch = base === '/' || url === base || url.startsWith(base + '/')
        if (baseMatch) {
          const stripped = base === '/' ? url : url.slice(base.length)
          if (serveFile(assetsRoot, stripped.replace(/^\/+/, ''), res)) return
        }
        if (serveFile(contentRoot, url.replace(/^\/+/, ''), res)) return
        next()
      })

      return () => {
        devServer.middlewares.use(async (req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') return next()
          if (!(req.headers.accept ?? '').includes('text/html')) return next()
          try {
            const html = await devServer.transformIndexHtml(
              req.url ?? '/',
              indexHtml(resolved, '/@id/__x00__virtual:nimpress/main')
            )
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html')
            res.end(html)
          } catch (err) {
            next(err as Error)
          }
        })
      }
    },

    async handleHotUpdate(ctx) {
      const file = ctx.file
      const isMd = file.endsWith('.md') && file.startsWith(contentRoot)
      const isPageCss = file.endsWith('.css') && file.startsWith(contentRoot)
      const isStory = file.endsWith('.story.ts') && file.startsWith(contentRoot)
      const ownsSpec = specToMd.get(file)
      const ownsComponent = componentToMd.get(file)
      if (isPageCss) {
        dropFileCache(file.replace(/\.css$/, '.md'))
        try {
          await processAll()
        } catch (err) {
          ctx.server.config.logger.error(String(err))
          return
        }
        invalidateMeta(ctx.server)
        ctx.server.ws.send({ type: 'full-reload' })
        return []
      }
      if (!isMd && !isStory && !ownsSpec && !ownsComponent) return
      const targetMd = isMd ? file : isStory ? join(dirname(file), 'index.md') : (ownsSpec ?? ownsComponent)!
      dropFileCache(targetMd)
      try {
        await processAll()
      } catch (err) {
        ctx.server.config.logger.error(String(err))
        return
      }
      invalidateMeta(ctx.server)
      invalidateAllBodies(ctx.server)
      ctx.server.ws.send({ type: 'full-reload' })
      return []
    },

    resolveId(id) {
      if (id === VIRTUAL_MANIFEST) return '\0' + VIRTUAL_MANIFEST
      if (id === VIRTUAL_SEARCH) return '\0' + VIRTUAL_SEARCH
      if (id === VIRTUAL_PAGES) return '\0' + VIRTUAL_PAGES
      if (id === VIRTUAL_BODIES) return '\0' + VIRTUAL_BODIES
      if (id === VIRTUAL_CONFIG) return '\0' + VIRTUAL_CONFIG
      if (id === VIRTUAL_MAIN) return '\0' + VIRTUAL_MAIN
      if (id.startsWith(PAGE_COMPONENT_PREFIX) && id.endsWith('.svelte')) {
        return id
      }
      if (id.startsWith(PAGE_BODY_PREFIX) && id.endsWith('.js')) {
        return id
      }
      return null
    },

    async load(id) {
      if (id === '\0' + VIRTUAL_MANIFEST) {
        return `export default ${JSON.stringify(buildManifest())}`
      }
      if (id === '\0' + VIRTUAL_CONFIG) {
        return `export default ${JSON.stringify(runtimeConfig(resolved))}`
      }
      if (id === '\0' + VIRTUAL_MAIN) {
        const cssImports = resolved.css
          .map((href) => `import ${JSON.stringify(href.startsWith('/') ? href : '/' + href)}`)
          .join('\n')
        const clientPath = resolved.client
          ? (resolved.client.startsWith('/') ? resolved.client : '/' + resolved.client.replace(/^\.\//, ''))
          : null
        const clientImport = clientPath
          ? `import { authFunctions, subscribeFunctions } from ${JSON.stringify(clientPath)}`
          : ''
        const clientArgs = clientPath ? ', authFunctions, subscribeFunctions' : ''
        return `import '@nimling/nimpress/app.css'
${cssImports}
import { createNimpressApp } from '@nimling/nimpress'
import config from 'virtual:nimpress/config'
import manifest from 'virtual:nimpress/manifest'
import searchIndex from 'virtual:nimpress/search'
import pages from 'virtual:nimpress/pages'
${clientImport}
const app = createNimpressApp({ ...config, manifest, searchIndex, pageLoader: pages${clientArgs} })
const target = document.getElementById('app')
if (!target) throw new Error('Mount target #app missing')
app.mount(target)
`
      }
      if (id === '\0' + VIRTUAL_SEARCH) {
        return `export default ${JSON.stringify(buildSearch())}`
      }
      if (id === '\0' + VIRTUAL_PAGES) {
        return buildPagesEntry()
      }
      if (id === '\0' + VIRTUAL_BODIES) {
        return buildBodiesEntry()
      }
      if (id.startsWith(PAGE_COMPONENT_PREFIX) && id.endsWith('.svelte')) {
        const safe = id.slice(PAGE_COMPONENT_PREFIX.length, -'.svelte'.length)
        return buildPageComponent(fromUrlSlug(safe))
      }
      if (id.startsWith(PAGE_BODY_PREFIX) && id.endsWith('.js')) {
        const safe = id.slice(PAGE_BODY_PREFIX.length, -'.js'.length)
        return buildPageBody(fromUrlSlug(safe))
      }
      return null
    }
  }
}

export function defineConfig(config: NimpressUserConfig): NimpressUserConfig {
  return config
}

export async function lintContent(cwd: string, contentDir: string): Promise<string[]> {
  const root = resolve(cwd, contentDir)
  const files = await walk(root)
  const problems: string[] = []
  for (const file of files) {
    let raw: string
    try {
      raw = await readFile(file, 'utf-8')
    } catch {
      continue
    }
    const { data } = matter(raw)
    for (const issue of frontmatterIssues(data)) {
      problems.push(`${relative(root, file).split(sep).join('/')}: ${issue}`)
    }
  }
  return problems
}

export type { NimpressUserConfig, ResolvedNimpressConfig, NimpressBannerConfig } from './types'
