import type { Plugin } from 'vite'
import { readFile, readdir } from 'node:fs/promises'
import { resolve, relative, join, sep, dirname, isAbsolute } from 'node:path'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import attrs from 'markdown-it-attrs'
import container from 'markdown-it-container'
import footnote from 'markdown-it-footnote'
import taskLists from 'markdown-it-task-lists'
import { z } from 'zod'
import { createHighlighter, type Highlighter } from 'shiki'
import { buildBanner, readConsumerPackage, type BannerOptions } from './banner'
import type {
  Frontmatter,
  Heading,
  PageMeta,
  PageType,
  SearchEntry,
  SidebarNode
} from './types'

const VIRTUAL_MANIFEST = 'virtual:nimpress/manifest'
const VIRTUAL_SEARCH = 'virtual:nimpress/search'
const VIRTUAL_PAGES = 'virtual:nimpress/pages'
const PAGE_COMPONENT_PREFIX = 'virtual:nimpress/page-component/'

const frontmatterSchema = z.object({
  title: z.string(),
  slug: z.string().optional(),
  type: z.union([z.literal('doc'), z.literal('openapi')]).optional(),
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
  noToc: z.boolean().optional()
}).passthrough()

export interface NimpressMarkdownOptions {
  contentDir: string
  banner?: BannerOptions | false
  exclude?: string[]
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
}

function slugFromPath(root: string, file: string): string {
  const rel = relative(root, file).split(sep).join('/')
  return rel.replace(/\.md$/, '').replace(/\/index$/, '').replace(/^index$/, '')
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

function buildMarkdownIt(highlighter: Highlighter) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    highlight(code, lang) {
      const aliases: Record<string, string> = {
        curl: 'bash',
        sh: 'bash',
        zsh: 'bash',
        console: 'bash',
        hurl: 'http'
      }
      const display = lang || 'text'
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
  md.use(footnote)
  md.use(taskLists, { enabled: true })

  const calloutTypes = ['tip', 'note', 'warning', 'info', 'check']
  for (const type of calloutTypes) {
    md.use(container, type, {
      render(tokens: { nesting: number; info: string }[], idx: number) {
        if (tokens[idx].nesting === 1) {
          const title = tokens[idx].info.trim().slice(type.length).trim() || type
          return `<div class="np-callout np-callout-${type}"><div class="np-callout-body"><div class="np-callout-title">${md.utils.escapeHtml(title)}</div>`
        }
        return '</div></div>'
      }
    })
  }

  md.use(container, 'cards', {
    render(tokens: { nesting: number }[], idx: number) {
      return tokens[idx].nesting === 1
        ? '<div class="np-cards-grid">'
        : '</div>'
    }
  })

  md.use(container, 'details', {
    validate(params: string) {
      return /^details\b/.test(params.trim())
    },
    render(tokens: { nesting: number; info: string }[], idx: number) {
      if (tokens[idx].nesting === 1) {
        const m = tokens[idx].info.trim().match(/^details\s*(.*)$/)
        const title = (m && m[1]) || 'Details'
        return `<details class="np-details"><summary class="np-details-summary">${md.utils.escapeHtml(title)}</summary><div class="np-details-body">\n`
      }
      return '</div></details>\n'
    }
  })

  md.use(container, 'code-group', {
    render(tokens: { nesting: number }[], idx: number) {
      return tokens[idx].nesting === 1
        ? '<div class="np-code-group">'
        : '</div>'
    }
  })

  return md
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

export default function nimpressMarkdown(options: NimpressMarkdownOptions): Plugin {
  const contentRoot = resolve(process.cwd(), options.contentDir)
  let pages = new Map<string, ProcessedPage>()
  let highlighter: Highlighter | null = null

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
      return JSON.parse(raw)
    } catch (err) {
      console.warn(`[nimpress] failed to load spec ${specRef} for ${mdFile}:`, err)
      return null
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

  function specDeref(value: any, spec: any, seen: WeakSet<object> = new WeakSet()): any {
    if (value == null || typeof value !== 'object') return value
    if (seen.has(value)) return value
    seen.add(value)
    if (typeof (value as any).$ref === 'string') {
      const resolved = specResolveRef(spec, (value as any).$ref)
      if (resolved == null) return value
      return specDeref(resolved, spec, seen)
    }
    if (Array.isArray(value)) {
      return value.map((v) => specDeref(v, spec, seen))
    }
    const out: any = {}
    for (const k of Object.keys(value)) {
      out[k] = specDeref(value[k], spec, seen)
    }
    return out
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
    const spec = specDeref(rawSpec, rawSpec)
    const info = spec.info ?? {}
    const securitySchemes = spec.components?.securitySchemes ?? {}
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

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
    const operations: Record<string, FlatOp> = {}
    const paths = spec.paths ?? {}

    for (const [path, pathItem] of Object.entries(paths) as [string, any][]) {
      const inheritedParams = (pathItem.parameters ?? []) as any[]
      for (const method of methods) {
        const op = pathItem[method]
        if (!op) continue
        const id = op.operationId ?? `${method}-${path.replace(/[^a-z0-9]+/gi, '-')}`
        const tag = op.tags?.[0] ?? 'default'
        const merged = [...inheritedParams, ...(op.parameters ?? [])]
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
            example: p.example ?? p.schema?.example
          })
        }

        const reqBody = op.requestBody as any
        const reqJson = reqBody?.content?.['application/json']
        const reqExample =
          reqJson?.example ??
          (reqJson?.examples ? Object.values(reqJson.examples as Record<string, any>)[0]?.value : undefined) ??
          reqJson?.schema?.example

        const responseExamples: Record<string, unknown> = {}
        const responses = op.responses ?? {}
        for (const [code, r] of Object.entries(responses) as [string, any][]) {
          const rJson = r?.content?.['application/json']
          const ex =
            rJson?.example ??
            (rJson?.examples ? Object.values(rJson.examples as Record<string, any>)[0]?.value : undefined) ??
            rJson?.schema?.example
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
        operations[id] = flatOp
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
      schemas[name] = {
        ...s,
        description_html: renderMd(md, s?.description)
      }
    }

    return {
      title: info.title ?? 'API',
      version: info.version ?? '',
      description: info.description,
      description_html: renderMd(md, info.description),
      servers: spec.servers,
      securitySchemes,
      tags,
      operations,
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

    const hl = await ensureHighlighter()
    const md = buildMarkdownIt(hl)
    const prepared = rewriteMermaid(content)
    const headings = collectHeadings(md, prepared)
    const html = md.render(prepared)

    let openApiSpec: unknown | undefined
    if (type === 'openapi') {
      if (!fm.spec) {
        console.warn(`[nimpress] page ${file} has type openapi but no spec field`)
      } else {
        const raw = await loadSpec(file, fm.spec)
        openApiSpec = raw ? flattenSpecForEmbed(raw, md) ?? undefined : undefined
      }
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
      openApiSpec
    }
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

    for (const file of files) {
      let p: ProcessedPage | null = null
      try {
        p = await processFile(file)
      } catch (err) {
        console.warn(`[nimpress] failed to process ${file}:`, err)
        continue
      }
      if (!p) continue
      if (isExcluded(p.slug)) continue
      const seen = pathToFile.get(p.effectivePath)
      if (seen) {
        throw new Error(
          `[nimpress] duplicate path ${p.effectivePath}: ${seen} and ${p.filePath}`
        )
      }
      pathToFile.set(p.effectivePath, p.filePath)
      result.set(p.slug, p)
    }
    pages = result
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
      if (p.frontmatter.hidden) continue
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
        } else if (items.length) {
          node.items = items
        }
        return node
      }

      const node: SidebarNode = {
        text: prettyDirName(t.segment),
        slug: t.fullPath.replace(/^\//, '')
      }
      if (items.length) node.items = items
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
        redirect: p.frontmatter.redirect
      }
      pageMap[slug] = meta
      byPath[p.effectivePath] = slug
    }

    return { pages: pageMap, byPath, sidebar: buildSidebar() }
  }

  function buildSearch(): SearchEntry[] {
    const out: SearchEntry[] = []
    for (const [slug, p] of pages) {
      if (p.frontmatter.hidden) continue
      out.push({
        slug,
        path: p.effectivePath,
        title: p.frontmatter.title,
        description: p.frontmatter.description,
        body: p.rawText.replace(/```[\s\S]*?```/g, '').replace(/[#*`>_\[\]\(\)]/g, ' '),
        scope: p.frontmatter.scope,
        claim: p.frontmatter.claim,
        headings: p.headings.map((h) => h.text)
      })
    }
    return out
  }

  function urlSlug(slug: string): string {
    return slug === '' ? '__root__' : slug
  }

  function fromUrlSlug(safe: string): string {
    return safe === '__root__' ? '' : safe
  }

  function buildPagesEntry(): string {
    const entries: string[] = []
    for (const slug of pages.keys()) {
      const id = `${PAGE_COMPONENT_PREFIX}${urlSlug(slug)}.svelte`
      entries.push(`  ${JSON.stringify(slug)}: () => import(${JSON.stringify(id)})`)
    }
    return `export const pages = {\n${entries.join(',\n')}\n}\nexport default pages\n`
  }

  function buildPageComponent(slug: string): string | null {
    const p = pages.get(slug)
    if (!p) return null
    const payload = {
      slug: p.slug,
      path: p.effectivePath,
      type: p.type,
      frontmatter: p.frontmatter,
      html: p.html,
      headings: p.headings,
      openApiSpec: p.openApiSpec
    }
    const json = JSON.stringify(payload).replace(/<\/script>/g, '<\\/script>')
    return `<script lang="ts">
  import { Page, OpenApiRoot } from '@nimling/nimpress'
  const page = ${json}
</script>

{#if page.type === 'openapi' && page.openApiSpec}
  <OpenApiRoot spec={page.openApiSpec} title={page.frontmatter.title} />
{:else}
  <Page {page} />
{/if}
`
  }

  return {
    name: '@nimling/nimpress:markdown',

    async buildStart() {
      await processAll()
    },

    configureServer(server) {
      if (options.banner === false) return
      const consumer = readConsumerPackage()
      const userBanner: BannerOptions = options.banner ?? {}
      const startedAt = Date.now()
      server.printUrls = function () {
        const urls = server.resolvedUrls
        const local = urls?.local?.[0] ?? `http://localhost:${server.config.server.port ?? 5173}/`
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
      if (!ctx.file.endsWith('.md')) return
      if (!ctx.file.startsWith(contentRoot)) return
      try {
        await processAll()
      } catch (err) {
        ctx.server.config.logger.error(String(err))
        return
      }
      const mod = ctx.server.moduleGraph.getModuleById('\0' + VIRTUAL_MANIFEST)
      const mod2 = ctx.server.moduleGraph.getModuleById('\0' + VIRTUAL_SEARCH)
      const mod3 = ctx.server.moduleGraph.getModuleById('\0' + VIRTUAL_PAGES)
      const out = [mod, mod2, mod3].filter(Boolean) as never[]
      return out
    },

    resolveId(id) {
      if (id === VIRTUAL_MANIFEST) return '\0' + VIRTUAL_MANIFEST
      if (id === VIRTUAL_SEARCH) return '\0' + VIRTUAL_SEARCH
      if (id === VIRTUAL_PAGES) return '\0' + VIRTUAL_PAGES
      if (id.startsWith(PAGE_COMPONENT_PREFIX) && id.endsWith('.svelte')) {
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
      if (id.startsWith(PAGE_COMPONENT_PREFIX) && id.endsWith('.svelte')) {
        const safe = id.slice(PAGE_COMPONENT_PREFIX.length, -'.svelte'.length)
        return buildPageComponent(fromUrlSlug(safe))
      }
      return null
    }
  }
}
