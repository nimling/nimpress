import type { Plugin, ViteDevServer } from 'vite'
import { readFile, readdir, copyFile } from 'node:fs/promises'
import { resolve, relative, join, sep, dirname, isAbsolute } from 'node:path'
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
import { buildBanner, readConsumerPackage, type BannerOptions } from './banner'
import type {
  ChangelogEntry,
  Frontmatter,
  Heading,
  PageMeta,
  PageType,
  RoadmapChangelogRef,
  RoadmapEntry,
  RoadmapKind,
  RoadmapStatus,
  SearchEntry,
  SidebarNode
} from './types'

const VIRTUAL_MANIFEST = 'virtual:nimpress/manifest'
const VIRTUAL_SEARCH = 'virtual:nimpress/search'
const VIRTUAL_PAGES = 'virtual:nimpress/pages'
const VIRTUAL_BODIES = 'virtual:nimpress/bodies'
const PAGE_COMPONENT_PREFIX = 'virtual:nimpress/page-component/'
const PAGE_BODY_PREFIX = 'virtual:nimpress/page-body/'

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
    z.literal('bug')
  ]).optional(),
  path: z.string().optional(),
  spec: z.string().optional(),
  scope: z.string().optional(),
  claim: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  icon: z.string().optional(),
  hidden: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  lastUpdated: z.boolean().optional(),
  redirect: z.string().optional(),
  noToc: z.boolean().optional(),
  footer: z.string().optional(),
  background: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  meta: metaTagsSchema.optional(),
  data: z.record(z.unknown()).optional()
}).passthrough()

export interface NimpressMarkdownOptions {
  contentDir: string
  banner?: BannerOptions | false
  exclude?: string[]
  defaultFrontmatter?: Partial<Frontmatter>
  defaultFrontmatterExclude?: string[]
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
  openApiSpec?: unknown
  changelogEntries?: ChangelogEntry[]
  roadmapEntries?: RoadmapEntry[]
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

export default function nimpress(options: NimpressMarkdownOptions): Plugin {
  const contentRoot = resolve(process.cwd(), options.contentDir)
  let pages = new Map<string, ProcessedPage>()
  let highlighter: Highlighter | null = null
  let resolvedOutDir = resolve(process.cwd(), 'dist')
  let isBuildCommand = false
  let server: ViteDevServer | null = null
  const fileCache = new Map<string, { hash: string; processed: ProcessedPage }>()
  const specToMd = new Map<string, string>()
  const trackedSpecs = new Set<string>()

  function hashContent(text: string): string {
    return createHash('sha1').update(text).digest('hex')
  }

  function sidebarSignature(p: ProcessedPage): string {
    const f = p.frontmatter
    return JSON.stringify({
      type: p.type,
      effectivePath: p.effectivePath,
      title: f.title,
      slug: f.slug,
      path: f.path,
      order: f.order,
      hidden: f.hidden,
      collapsed: f.collapsed,
      icon: f.icon,
      redirect: f.redirect,
      scope: f.scope,
      claim: f.claim,
      description: f.description,
      meta: f.meta,
      data: f.data,
      tags: f.tags
    })
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

    const parsed = frontmatterSchema.safeParse(data)
    if (!parsed.success) {
      console.warn(`[nimpress] invalid frontmatter in ${file}: ${parsed.error.message}`)
    }
    const fm = (parsed.success ? parsed.data : { title: file }) as Frontmatter

    const slug = slugFromPath(contentRoot, file)
    const type: PageType = fm.type ?? 'doc'
    const effectivePath = normalizePath(fm.path ?? defaultPathFromSlug(slug))

    const defaults = options.defaultFrontmatter ?? {}
    const defaultExcludes = options.defaultFrontmatterExclude ?? []
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

    return {
      slug,
      filePath: file,
      effectivePath,
      type,
      frontmatter: fm,
      html,
      headings,
      rawText: content,
      openApiSpec
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
    const list = options.exclude ?? []
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
        const groupKey = `${parent} ${p.frontmatter.title}`
        const list = changelogGroups.get(groupKey) ?? []
        list.push(p)
        changelogGroups.set(groupKey, list)
        continue
      }
      if (p.type === 'roadmap') {
        const groupKey = String(p.filePath)
        roadmapGroups.set(groupKey, [p])
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
      const parent = groupKey.split(' ', 1)[0]
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
          type: 'changelog'
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

    pages = result
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

  function buildSidebar(): SidebarNode[] {
    interface TreeNode {
      segment: string
      fullPath: string
      page?: ProcessedPage
      children: Map<string, TreeNode>
    }

    const root: TreeNode = { segment: '', fullPath: '', children: new Map() }

    for (const p of pages.values()) {
      if (isBuildCommand && p.frontmatter.hidden) continue
      if (p.effectivePath === '/') continue
      const segments = p.effectivePath.split('/').filter(Boolean)
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
          collapsed: t.page.frontmatter.collapsed
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
              order: idx
            }
            if (kids.length) node.items = kids.map((k, i) => buildEntryNode(k, i))
            return node
          }
          const entryNodes = roots.map((e, idx) => buildEntryNode(e, idx))
          const filteredItems = items.filter((it) => !it.slug || !entries.some((e) => e.slug === it.slug))
          node.items = filteredItems.length ? [...entryNodes, ...filteredItems] : entryNodes
        } else if (items.length) {
          node.items = items
        }
        if (node.collapsed !== false && node.items?.some((it) => it.collapsed === false)) {
          node.collapsed = false
        }
        return node
      }

      const node: SidebarNode = {
        text: prettyDirName(t.segment),
        slug: t.fullPath.replace(/^\//, '')
      }
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
      if (isBuildCommand && p.frontmatter.hidden) continue
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
    }

    return { pages: pageMap, byPath, sidebar: buildSidebar() }
  }

  function buildSearch(): SearchEntry[] {
    const out: SearchEntry[] = []
    for (const [slug, p] of pages) {
      if (isBuildCommand && p.frontmatter.hidden) continue
      const baseBody = p.rawText.replace(/```[\s\S]*?```/g, '').replace(/[#*`>_\[\]\(\)]/g, ' ')
      const specBody = p.type === 'openapi' ? extractOpenApiText(p.openApiSpec) : ''
      const roadmapBody = p.type === 'roadmap' ? extractRoadmapText(p.roadmapEntries ?? []) : ''
      const body = [baseBody, specBody, roadmapBody].filter(Boolean).join(' \n ')
      out.push({
        slug,
        path: p.effectivePath,
        title: p.frontmatter.title,
        description: p.frontmatter.description,
        body,
        scope: p.frontmatter.scope,
        claim: p.frontmatter.claim,
        headings: p.headings.map((h) => h.text),
        tags: normalizeTags(p.frontmatter.tags)
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
      if (isBuildCommand && p.frontmatter.hidden) continue
      const id = `${PAGE_COMPONENT_PREFIX}${urlSlug(slug)}.svelte`
      entries.push(`  ${JSON.stringify(slug)}: () => import(${JSON.stringify(id)})`)
    }
    return `export const pages = {\n${entries.join(',\n')}\n}\nexport default pages\n`
  }

  function buildBodiesEntry(): string {
    const entries: string[] = []
    for (const [slug, p] of pages) {
      if (isBuildCommand && p.frontmatter.hidden) continue
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
      roadmapEntries: p.roadmapEntries
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
  import { Page, OpenApiRoot, ChangelogPage, HeroPage, RoadmapPage, setPageMeta } from '@nimling/nimpress'
  import type { PageBody } from '@nimling/nimpress'
  const shell = ${json}
  setPageMeta(shell)
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
    },

    configureServer(devServer) {
      server = devServer
      for (const specPath of trackedSpecs) devServer.watcher.add(specPath)

      const onAdd = async (file: string) => {
        if (!file.endsWith('.md')) return
        if (!file.startsWith(contentRoot)) return
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
        if (file.endsWith('.md') && file.startsWith(contentRoot)) {
          dropFileCache(file)
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
      }
      devServer.watcher.on('add', onAdd)
      devServer.watcher.on('unlink', onUnlink)

      if (options.banner === false) return
      const consumer = readConsumerPackage()
      const userBanner: BannerOptions = options.banner ?? {}
      const startedAt = Date.now()
      devServer.printUrls = function () {
        const urls = devServer.resolvedUrls
        const local = urls?.local?.[0] ?? `http://localhost:${devServer.config.server.port ?? 5173}/`
        const network = urls?.network?.[0] ?? 'use --host to expose'
        const banner = buildBanner({
          title: userBanner.title ?? consumer.name ?? 'Nimpress',
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
    },

    async handleHotUpdate(ctx) {
      const file = ctx.file
      const isMd = file.endsWith('.md') && file.startsWith(contentRoot)
      const ownsSpec = specToMd.get(file)
      if (!isMd && !ownsSpec) return
      const targetMd = isMd ? file : ownsSpec!
      const targetSlug = slugFromPath(contentRoot, targetMd)
      const prev = pages.get(targetSlug)
      const prevSig = prev ? sidebarSignature(prev) : null
      dropFileCache(targetMd)
      try {
        await processAll()
      } catch (err) {
        ctx.server.config.logger.error(String(err))
        return
      }
      const next = pages.get(targetSlug)
      const nextSig = next ? sidebarSignature(next) : null
      const sidebarChanged = prevSig !== nextSig || !prev || !next
      const mods: unknown[] = []
      const pushById = (id: string) => {
        const m = ctx.server.moduleGraph.getModuleById(id)
        if (m) mods.push(m)
      }
      const slugForUrl = next?.slug ?? targetSlug
      pushById('\0' + PAGE_BODY_PREFIX + urlSlug(slugForUrl) + '.js')
      pushById('\0' + PAGE_COMPONENT_PREFIX + urlSlug(slugForUrl) + '.svelte')
      if (sidebarChanged) {
        pushById('\0' + VIRTUAL_MANIFEST)
        pushById('\0' + VIRTUAL_SEARCH)
        pushById('\0' + VIRTUAL_PAGES)
        pushById('\0' + VIRTUAL_BODIES)
      }
      return mods as never[]
    },

    resolveId(id) {
      if (id === VIRTUAL_MANIFEST) return '\0' + VIRTUAL_MANIFEST
      if (id === VIRTUAL_SEARCH) return '\0' + VIRTUAL_SEARCH
      if (id === VIRTUAL_PAGES) return '\0' + VIRTUAL_PAGES
      if (id === VIRTUAL_BODIES) return '\0' + VIRTUAL_BODIES
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
