import type { Plugin, ViteDevServer } from 'vite'
import { readFile, readdir, copyFile, cp, mkdir, writeFile } from 'node:fs/promises'
import { createReadStream, existsSync, statSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { request as httpRequest } from 'node:http'
import { execFileSync } from 'node:child_process'
import { resolve, relative, join, sep, dirname, basename, isAbsolute, extname } from 'node:path'
import { createHash } from 'node:crypto'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import attrs from 'markdown-it-attrs'
import container from 'markdown-it-container'
import deflist from 'markdown-it-deflist'
import footnote from 'markdown-it-footnote'
import taskLists from 'markdown-it-task-lists'
import mark from 'markdown-it-mark'
import sub from 'markdown-it-sub'
import sup from 'markdown-it-sup'
import { full as emoji } from 'markdown-it-emoji'
import { z } from 'zod'
import { parse as parseYamlText } from 'yaml'
import { createHighlighter, type Highlighter, type ShikiTransformer, type ThemedToken } from 'shiki'
import { buildBanner, readConsumerPackage } from './banner'
import type {
  ChangelogEntry,
  ComponentPageData,
  Frontmatter,
  Heading,
  NimpressUserConfig,
  PageMeta,
  PageType,
  PageElement,
  ManifestTag,
  GlossaryTerm,
  ResolvedNimpressConfig,
  RoadmapChangelogRef,
  RoadmapEntry,
  RoadmapKind,
  RoadmapStatus,
  SearchEntry,
  SidebarNode
} from './types'
import { DbmlError, dbmlToErdJson } from './dbml/erd'
import { buildComponentPageData } from './modules/componentData'
import { flushDiagnostics, parseSchemaText, renderSchemaText } from './modules/schema'
import { harnessPort } from './modules/harness'
import { defaultConfig } from './config/defaults'
import { loadNimpressConfig, runtimeConfig } from './config/load'
import { joinBase, stripBase } from './config/base'
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

const pageHiddenEverywhere = (fm: { visibility?: string }): boolean =>
  fm.visibility === 'hidden'
const pageExcludedFromBuild = (fm: { visibility?: string }): boolean =>
  fm.visibility === 'hidden' || fm.visibility === 'dev-only'
const pageDevOnly = (fm: { visibility?: string }): boolean =>
  fm.visibility === 'dev-only'

const issueKindIcon: Record<RoadmapKind, string> = {
  milestone:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>',
  epic:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  feature:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>',
  bug:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>'
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
  title: z.string().optional(),
  slug: z.string().optional(),
  type: z.string().optional(),
  path: z.string().optional(),
  spec: z.string().optional(),
  gate: z.string().optional(),
  link: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  icon: z.string().optional(),
  sidebar: z.object({
    name: z.string().min(1),
    icon: z.string().optional(),
    style: z.string().optional(),
    path: z.string().optional()
  }).optional(),
  visibility: z.enum(['visible', 'hidden', 'dev-only']).optional(),
  collapsed: z.boolean().optional(),
  lastUpdated: z.boolean().optional(),
  redirect: z.string().optional(),
  hide: z.array(z.enum(['navigation', 'toc', 'path', 'footer', 'tags'])).optional(),
  status: z.string().optional(),
  footer: z.string().optional(),
  background: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  rss: z.boolean().optional(),
  subscribe: z.boolean().optional(),
  feedback: z.boolean().optional(),
  styles: z.array(z.string()).optional(),
  meta: metaTagsSchema.optional(),
  data: z.record(z.unknown()).optional()
}).passthrough()

const BUILT_IN_PAGE_TYPES = new Set(['doc', 'openapi', 'changelog', 'hero', 'fullpage', '404', 'section', 'tags', 'glossary', 'team', 'pricing', 'roadmap', 'dbml', 'milestone', 'epic', 'feature', 'bug', 'component'])

interface CustomDataSchema {
  required?: string[]
  properties?: Record<string, { type?: string }>
}

interface CustomPageType {
  file: string
  schema?: CustomDataSchema
}

const customPageTypes = new Map<string, CustomPageType>()

export function setCustomPageTypes(cwd: string, pageTypes: Record<string, string>): void {
  customPageTypes.clear()
  for (const [name, file] of Object.entries(pageTypes)) {
    const abs = resolve(cwd, file)
    const schemaFile = abs.replace(/\.svelte$/, '.schema.json')
    let schema: CustomDataSchema | undefined
    if (schemaFile !== abs && existsSync(schemaFile)) {
      try {
        schema = JSON.parse(readFileSync(schemaFile, 'utf-8')) as CustomDataSchema
      } catch {
        console.warn(`[nimpress] page type ${name}: ${schemaFile} is not valid json`)
      }
    }
    customPageTypes.set(name, { file, schema })
  }
}

function jsonType(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (value === null) return 'null'
  return typeof value
}

function customDataIssues(type: string, data: Record<string, unknown>): string[] {
  const schema = customPageTypes.get(type)?.schema
  if (!schema) return []
  const issues: string[] = []
  for (const key of schema.required ?? []) {
    if (data[key] === undefined) issues.push(`type ${type} requires data.${key}`)
  }
  for (const [key, spec] of Object.entries(schema.properties ?? {})) {
    if (data[key] !== undefined && spec.type && jsonType(data[key]) !== spec.type) issues.push(`type ${type} expects data.${key} to be ${spec.type}`)
  }
  return issues
}

function frontmatterIssues(data: unknown, body = 'x'): string[] {
  const issues: string[] = []
  const keys = typeof data === 'object' && data !== null ? Object.keys(data) : []
  const railBoolean = keys.find((key) => key.toLowerCase() === 'notoc')
  if (railBoolean) {
    issues.push(`${railBoolean}: write hide: [toc], the hide list carries every element a page drops`)
  }
  const parsed = frontmatterSchema.safeParse(data)
  if (!parsed.success) {
    for (const e of parsed.error.errors) {
      issues.push(`${e.path.join('.') || 'frontmatter'}: ${e.message}`)
    }
    return issues
  }
  const fm = parsed.data
  if (fm.type && !BUILT_IN_PAGE_TYPES.has(fm.type) && !customPageTypes.has(fm.type)) {
    issues.push(`type: ${fm.type} is not a page type; add it under pageTypes in the config`)
  }
  const d = (fm.data ?? {}) as Record<string, unknown>
  if (fm.link) {
    if (!fm.title && !fm.sidebar?.name) issues.push('a link page needs a title or a sidebar.name for its label')
    if (!/^[a-z][a-z0-9+.-]*:\/\/|^mailto:|^tel:/i.test(fm.link)) issues.push('link: must be an absolute url')
    if (body.trim() !== '') issues.push('a link page carries no body, the entry opens link instead of a page')
    return issues
  }
  const decorationOnly = (data as Record<string, unknown>).type === undefined && body.trim() === ''
  if (decorationOnly) {
    if (!fm.sidebar?.name) issues.push('a page without a type and without a body needs a sidebar.name to decorate its group')
    return issues
  }
  if (!fm.title) issues.push('title: Required')
  if (fm.type === 'openapi' && !fm.spec) {
    issues.push('type openapi requires a spec field')
  }
  if (fm.type === 'dbml' && !fm.spec) {
    issues.push('type dbml requires a spec field')
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
  if (fm.type && customPageTypes.has(fm.type)) issues.push(...customDataIssues(fm.type, d))
  if (fm.type === 'team') {
    const members = Array.isArray(d.members) ? (d.members as Array<Record<string, unknown>>) : []
    if (members.length === 0) issues.push('type team requires data.members with at least one member')
    members.forEach((member, index) => {
      if (typeof member?.name !== 'string' || !member.name.trim()) issues.push(`type team member ${index + 1} needs a name`)
    })
  }
  if (fm.type === 'pricing') {
    const tiers = Array.isArray(d.tiers) ? (d.tiers as Array<Record<string, unknown>>) : []
    if (tiers.length === 0) issues.push('type pricing requires data.tiers with at least one tier')
    tiers.forEach((tier, index) => {
      if (typeof tier?.name !== 'string' || !tier.name.trim()) issues.push(`type pricing tier ${index + 1} needs a name`)
    })
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
  sidebarOnly?: boolean
  linkTo?: string
  frontmatter: Frontmatter
  html: string
  headings: Heading[]
  rawText: string
  pageCss?: string
  openApiSpec?: unknown
  openApiFile?: string
  openApiUrl?: string
  changelogEntries?: ChangelogEntry[]
  roadmapEntries?: RoadmapEntry[]
  componentData?: ComponentPageData
  dbmlSchema?: string
  dbmlSource?: string
  dbmlFile?: string
  dbmlError?: string
}

interface SubscribeMapEntry {
  slug: string
  version: string
  date?: string
  title: string
  description?: string
  body: string
}

interface SubscribeMapPage {
  path: string
  title: string
  name: string
  feed: string
  entries?: SubscribeMapEntry[]
}

export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const s = String(v ?? '').replace(/^v/i, '').replace(/\+.*$/, '')
    const dash = s.indexOf('-')
    return {
      base: (dash === -1 ? s : s.slice(0, dash)).split('.'),
      pre: dash === -1 ? '' : s.slice(dash + 1)
    }
  }
  const natural = (x: string, y: string): number => {
    const rx = x.match(/\d+|\D+/g) ?? []
    const ry = y.match(/\d+|\D+/g) ?? []
    for (let i = 0; i < Math.max(rx.length, ry.length); i++) {
      const l = rx[i]
      const r = ry[i]
      if (l === undefined) return -1
      if (r === undefined) return 1
      if (/^\d+$/.test(l) && /^\d+$/.test(r)) {
        const d = parseInt(l, 10) - parseInt(r, 10)
        if (d !== 0) return d
      } else if (l !== r) {
        return l < r ? -1 : 1
      }
    }
    return 0
  }
  const va = parse(a)
  const vb = parse(b)
  for (let i = 0; i < Math.max(va.base.length, vb.base.length); i++) {
    const ai = parseInt(va.base[i] ?? '0', 10) || 0
    const bi = parseInt(vb.base[i] ?? '0', 10) || 0
    if (ai !== bi) return ai - bi
  }
  if (!va.pre && !vb.pre) return 0
  if (!va.pre) return 1
  if (!vb.pre) return -1
  const ta = va.pre.split('.')
  const tb = vb.pre.split('.')
  for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
    const l = ta[i]
    const r = tb[i]
    if (l === undefined) return -1
    if (r === undefined) return 1
    const c = natural(l, r)
    if (c !== 0) return c
  }
  return 0
}

function contentUrl(root: string, file: string): string | undefined {
  const rel = relative(root, file).split(sep).join('/')
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return undefined
  return `/${rel}`
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

type ContainerToken = { type: string; nesting: number; info: string }

type ContainerOpts = {
  render: (tokens: ContainerToken[], idx: number) => string
  validate?: (params: string) => boolean
}

const KEY_GLYPHS: Record<string, string> = {
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  option: '⌥',
  opt: '⌥',
  shift: '⇧',
  cmd: '⌘',
  command: '⌘',
  meta: '⌘',
  win: '⊞',
  windows: '⊞',
  super: '⊞',
  enter: '↵',
  return: '↵',
  tab: '⇥',
  esc: 'Esc',
  escape: 'Esc',
  space: 'Space',
  backspace: '⌫',
  delete: 'Del',
  del: 'Del',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  home: 'Home',
  end: 'End',
  pgup: 'PgUp',
  pgdn: 'PgDn',
  plus: '+',
  minus: '−'
}

function keyLabel(name: string): string {
  const key = name.trim().toLowerCase()
  if (KEY_GLYPHS[key]) return KEY_GLYPHS[key]
  return key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1)
}

const insRule: Parameters<MarkdownIt['inline']['ruler']['before']>[2] = (state, silent) => {
  const src = state.src
  const start = state.pos
  if (src.charCodeAt(start) !== 0x5e || src.charCodeAt(start + 1) !== 0x5e) return false
  const end = src.indexOf('^^', start + 2)
  if (end < 0 || end === start + 2) return false
  const body = src.slice(start + 2, end)
  if (/\n/.test(body) || body.startsWith(' ') || body.endsWith(' ')) return false
  if (!silent) {
    state.push('ins_open', 'ins', 1)
    const text = state.push('text', '', 0)
    text.content = body
    state.push('ins_close', 'ins', -1)
  }
  state.pos = end + 2
  return true
}

const keysRule: Parameters<MarkdownIt['inline']['ruler']['before']>[2] = (state, silent) => {
  const src = state.src
  const start = state.pos
  if (src.charCodeAt(start) !== 0x2b || src.charCodeAt(start + 1) !== 0x2b) return false
  const end = src.indexOf('++', start + 2)
  if (end < 0 || end === start + 2) return false
  const body = src.slice(start + 2, end)
  if (!/^[a-z0-9+\- ]+$/i.test(body) || /\n/.test(body)) return false
  const names = body.split('+').map((name) => name.trim()).filter(Boolean)
  if (names.length === 0) return false
  if (!silent) {
    const token = state.push('html_inline', '', 0)
    token.content = `<span class="np-keys">${names
      .map((name) => `<kbd class="np-key">${state.md.utils.escapeHtml(keyLabel(name))}</kbd>`)
      .join('<span class="np-key-join">+</span>')}</span>`
  }
  state.pos = end + 2
  return true
}

const figuresRule: Parameters<MarkdownIt['core']['ruler']['push']>[1] = (state) => {
  const tokens = state.tokens
  for (let i = 0; i + 2 < tokens.length; i++) {
    if (tokens[i].type !== 'paragraph_open' || tokens[i + 1].type !== 'inline' || tokens[i + 2].type !== 'paragraph_close') continue
    const children = tokens[i + 1].children ?? []
    const meaningful = children.filter((child) => !(child.type === 'text' && child.content.trim() === ''))
    if (meaningful.length !== 1 || meaningful[0].type !== 'image' || !meaningful[0].attrGet('title')) continue
    meaningful[0].meta = { ...(meaningful[0].meta ?? {}), figure: true }
    tokens[i].tag = 'figure'
    tokens[i + 2].tag = 'figure'
    tokens[i].attrJoin('class', 'np-figure')
  }
}

export interface MarkdownFeatures {
  math?: boolean
  icons?: string
  glossary?: GlossaryTerm[]
}

const ICON_SHORTCODE = /^:([a-z0-9]+(?:-[a-z0-9]+)*):/
const requireFromPlugin = createRequire(import.meta.url)

function lucideDir(): string {
  try {
    return dirname(requireFromPlugin.resolve('lucide-static/icons/a-arrow-down.svg'))
  } catch {
    return resolve(process.cwd(), 'node_modules', 'lucide-static', 'icons')
  }
}

const iconCache = new Map<string, string | null>()

function loadIconSvg(name: string, iconsDir?: string): string | null {
  const key = `${iconsDir ?? ''}:${name}`
  const cached = iconCache.get(key)
  if (cached !== undefined) return cached
  let file: string | null = null
  if (name.startsWith('lucide-')) file = join(lucideDir(), `${name.slice('lucide-'.length)}.svg`)
  else if (iconsDir) file = resolve(process.cwd(), iconsDir, `${name}.svg`)
  let svg: string | null = null
  if (file && existsSync(file)) {
    svg = readFileSync(file, 'utf8')
      .replace(/<\?xml[^>]*>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+(width|height)="[^"]*"/g, '')
      .replace(/<svg/, '<svg aria-hidden="true" focusable="false"')
      .trim()
  }
  iconCache.set(key, svg)
  return svg
}

function iconAttrs(spec: string): Array<[string, string]> {
  const attrs: Array<[string, string]> = []
  const classes: string[] = []
  for (const part of spec.trim().split(/\s+/).filter(Boolean)) {
    if (part.startsWith('.')) classes.push(part.slice(1))
    else if (part.startsWith('#')) attrs.push(['id', part.slice(1)])
    else if (part.includes('=')) {
      const at = part.indexOf('=')
      attrs.push([part.slice(0, at), part.slice(at + 1).replace(/^"|"$/g, '')])
    }
  }
  if (classes.length) attrs.push(['class', classes.join(' ')])
  return attrs
}

function makeIconRule(iconsDir?: string): Parameters<MarkdownIt['inline']['ruler']['before']>[2] {
  return (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== 0x3a) return false
    const match = ICON_SHORTCODE.exec(state.src.slice(state.pos))
    if (!match) return false
    const name = match[1]
    const svg = loadIconSvg(name, iconsDir)
    if (!svg) {
      if (name.startsWith('lucide-')) console.warn(`[nimpress] icon :${name}: is not a lucide icon; the shortcode stays as text`)
      return false
    }
    let end = state.pos + match[0].length
    let attrs: Array<[string, string]> = []
    const rest = state.src.slice(end)
    const attrMatch = /^\{([^}\n]*)\}/.exec(rest)
    if (attrMatch) {
      attrs = iconAttrs(attrMatch[1])
      end += attrMatch[0].length
    }
    if (!silent) {
      const token = state.push('np_icon', 'span', 0)
      token.content = svg
      token.attrSet('data-icon', name)
      token.attrJoin('class', 'np-icon')
      for (const [key, value] of attrs) {
        if (key === 'class') token.attrJoin('class', value)
        else token.attrSet(key, value)
      }
    }
    state.pos = end
    return true
  }
}

function encodeMath(source: string): string {
  return Buffer.from(source, 'utf-8').toString('base64')
}

const mathBlockRule: Parameters<MarkdownIt['block']['ruler']['before']>[2] = (state, startLine, endLine, silent) => {
  const start = state.bMarks[startLine] + state.tShift[startLine]
  const max = state.eMarks[startLine]
  if (state.src.slice(start, start + 2) !== '$$') return false
  const firstLine = state.src.slice(start + 2, max)
  if (firstLine.trim().endsWith('$$') && firstLine.trim().length > 2) {
    if (silent) return true
    const token = state.push('np_math_block', 'div', 0)
    token.content = firstLine.trim().slice(0, -2).trim()
    token.map = [startLine, startLine + 1]
    state.line = startLine + 1
    return true
  }
  let line = startLine + 1
  const lines: string[] = []
  if (firstLine.trim()) lines.push(firstLine)
  let closed = false
  for (; line < endLine; line++) {
    const lineStart = state.bMarks[line] + state.tShift[line]
    const lineEnd = state.eMarks[line]
    const text = state.src.slice(lineStart, lineEnd)
    if (text.trim() === '$$') {
      closed = true
      break
    }
    if (text.trim().endsWith('$$')) {
      lines.push(text.trim().slice(0, -2))
      closed = true
      break
    }
    lines.push(text)
  }
  if (!closed) return false
  if (silent) return true
  const token = state.push('np_math_block', 'div', 0)
  token.content = lines.join('\n').trim()
  token.map = [startLine, line + 1]
  state.line = line + 1
  return true
}

const mathInlineRule: Parameters<MarkdownIt['inline']['ruler']['before']>[2] = (state, silent) => {
  const src = state.src
  const start = state.pos
  if (src.charCodeAt(start) !== 0x24 || src.charCodeAt(start + 1) === 0x24) return false
  if (start > 0 && src.charCodeAt(start - 1) === 0x5c) return false
  const after = src.charCodeAt(start + 1)
  if (Number.isNaN(after) || after === 0x20 || after === 0x0a) return false
  let end = start + 1
  while (end < src.length) {
    end = src.indexOf('$', end)
    if (end < 0) return false
    if (src.charCodeAt(end - 1) === 0x5c) {
      end += 1
      continue
    }
    break
  }
  if (end <= start + 1) return false
  const body = src.slice(start + 1, end)
  if (body.endsWith(' ') || body.includes('\n')) return false
  const next = src.charCodeAt(end + 1)
  if (next >= 0x30 && next <= 0x39) return false
  if (!silent) {
    const token = state.push('np_math_inline', 'span', 0)
    token.content = body
  }
  state.pos = end + 1
  return true
}

const ABBR_DEFINITION = /^\*\[([^\]\n]+)\]:[ \t]*(.+?)[ \t]*$/

const abbrDefinitionRule: Parameters<MarkdownIt['block']['ruler']['before']>[2] = (state, startLine, _endLine, silent) => {
  const start = state.bMarks[startLine] + state.tShift[startLine]
  const max = state.eMarks[startLine]
  if (state.src.charCodeAt(start) !== 0x2a || state.src.charCodeAt(start + 1) !== 0x5b) return false
  const match = ABBR_DEFINITION.exec(state.src.slice(start, max))
  if (!match) return false
  if (silent) return true
  const env = state.env as { abbr?: Record<string, string> }
  env.abbr = { ...(env.abbr ?? {}), [match[1].trim()]: match[2].trim() }
  state.line = startLine + 1
  return true
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function makeAbbrRule(glossary: GlossaryTerm[]): Parameters<MarkdownIt['core']['ruler']['after']>[2] {
  return (state) => {
    const env = state.env as { abbr?: Record<string, string>; glossaryPage?: boolean }
    const terms = new Map<string, string>()
    if (!env.glossaryPage) for (const entry of glossary) terms.set(entry.term, entry.description)
    for (const [term, description] of Object.entries(env.abbr ?? {})) terms.set(term, description)
    if (terms.size === 0) return
    const ordered = Array.from(terms.entries()).sort((a, b) => b[0].length - a[0].length)
    const canonical = new Map(ordered.map(([term]) => [term.toLowerCase(), term]))
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])(${ordered.map(([term]) => escapeRegExp(term)).join('|')})(?![\\p{L}\\p{N}_])`, 'iu')
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type !== 'inline' || !token.children) continue
      if (tokens[i - 1]?.type === 'heading_open') continue
      const used = new Set<string>()
      let depth = 0
      const next: typeof token.children = []
      for (const child of token.children) {
        if (child.type === 'link_open') depth += 1
        if (child.type === 'link_close') depth -= 1
        if (child.type !== 'text' || depth > 0) {
          next.push(child)
          continue
        }
        let rest = child.content
        while (rest.length) {
          const match = pattern.exec(rest)
          if (!match) break
          const written = match[2]
          const term = canonical.get(written.toLowerCase()) ?? written
          const exact = term === term.toUpperCase() && term.length > 1
          if (exact && written !== term) {
            const keep = new state.Token('text', '', 0)
            keep.content = rest.slice(0, match.index + match[1].length + written.length)
            next.push(keep)
            rest = rest.slice(match.index + match[1].length + written.length)
            continue
          }
          const at = match.index + match[1].length
          if (used.has(term)) {
            const keep = new state.Token('text', '', 0)
            keep.content = rest.slice(0, at + written.length)
            next.push(keep)
            rest = rest.slice(at + written.length)
            continue
          }
          used.add(term)
          if (at > 0) {
            const before = new state.Token('text', '', 0)
            before.content = rest.slice(0, at)
            next.push(before)
          }
          const open = new state.Token('abbr_open', 'abbr', 1)
          open.attrSet('class', 'np-abbr np-tip')
          open.attrSet('aria-label', terms.get(term) ?? '')
          next.push(open)
          const text = new state.Token('text', '', 0)
          text.content = written
          next.push(text)
          next.push(new state.Token('abbr_close', 'abbr', -1))
          rest = rest.slice(at + written.length)
        }
        if (rest.length) {
          const tail = new state.Token('text', '', 0)
          tail.content = rest
          next.push(tail)
        }
      }
      token.children = next
    }
  }
}

const glossaryAnchorRule: Parameters<MarkdownIt['core']['ruler']['push']>[1] = (state) => {
  const env = state.env as { glossaryPage?: boolean }
  if (!env.glossaryPage) return
  const tokens = state.tokens
  for (let i = 0; i + 1 < tokens.length; i++) {
    if (tokens[i].type !== 'dt_open' || tokens[i + 1].type !== 'inline') continue
    tokens[i].attrSet('id', `term-${slugify(tokens[i + 1].content)}`)
    tokens[i].attrJoin('class', 'np-glossary-term')
  }
}

const footnoteTipsRule: Parameters<MarkdownIt['core']['ruler']['after']>[2] = (state) => {
  const tokens = state.tokens
  const tips = new Map<number, string>()
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'footnote_open') continue
    const id = Number(tokens[i].meta?.id ?? -1)
    const parts: string[] = []
    for (let j = i + 1; j < tokens.length && tokens[j].type !== 'footnote_close'; j++) {
      if (tokens[j].type === 'inline') parts.push(tokens[j].content)
    }
    tips.set(id, parts.join(' ').replace(/[`*_\[\]]/g, '').trim())
  }
  if (tips.size === 0) return
  for (const token of tokens) {
    for (const child of token.children ?? []) {
      if (child.type !== 'footnote_ref') continue
      const tip = tips.get(Number(child.meta?.id ?? -1))
      if (tip) child.meta = { ...child.meta, tip }
    }
  }
}

function extractGlossary(md: MarkdownIt, body: string): GlossaryTerm[] {
  const tokens = md.parse(body, {})
  const out: GlossaryTerm[] = []
  let term = ''
  for (let i = 0; i + 1 < tokens.length; i++) {
    if (tokens[i].type === 'dt_open' && tokens[i + 1].type === 'inline') {
      term = tokens[i + 1].content.trim()
      continue
    }
    if (tokens[i].type === 'dd_open' && term) {
      let j = i + 1
      while (j < tokens.length && tokens[j].type !== 'inline' && tokens[j].type !== 'dd_close') j += 1
      const description = tokens[j]?.type === 'inline' ? tokens[j].content.trim() : ''
      if (description) out.push({ term, slug: `term-${slugify(term)}`, description })
      term = ''
    }
  }
  return out
}

export const CLASS_ROOTS = ['prose', 'page', 'callout', 'code', 'code-group', 'tabs', 'cards', 'card', 'features', 'feature', 'actions', 'action', 'hero', 'fullpage', 'section', 'tags', 'tag', 'footer', 'announce', 'feedback', 'header', 'sidebar', 'toc', 'crumbs', 'search', 'mermaid', 'dbml', 'op', 'changelog', 'roadmap', 'team', 'pricing', 'glossary', 'notfound', 'math', 'icon', 'figure', 'keys', 'lightbox', 'abbr', 'img', 'page-actions']

export function scopeCss(root: string, css: string): string {
  return `@scope (.np-${root}) {\n${css}\n}`
}

export function componentCssRoot(name: string, stem: string): string | null {
  const match = new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.([a-z0-9-]+)\\.css$`).exec(name)
  return match ? match[1] : null
}

function buildMarkdownIt(
  highlighter: Highlighter,
  embed: { route: string; system?: string } = { route: '/_components' },
  base = '/',
  features: MarkdownFeatures = { math: true }
): MarkdownIt {
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
      const fence = parseCodeFenceOptions(attrs ?? '')
      const preAttrs = codeFenceAttrs(display, fence)
      const explain: Record<string, unknown> = ANNOTATION_MARKER.test(code) ? { includeExplanation: 'scopeName' } : {}
      try {
        return highlighter.codeToHtml(code, {
          ...explain,
          lang: safeLang,
          theme: 'github-dark',
          transformers: [codeFenceTransformer(preAttrs, fence)]
        })
      } catch {
        const attrList = Object.entries(preAttrs)
          .map(([key, value]) => `${key}="${md.utils.escapeHtml(value)}"`)
          .join(' ')
        return `<pre ${attrList}><code>${md.utils.escapeHtml(code)}</code></pre>`
      }
    }
  })

  type RenderRule = NonNullable<MarkdownIt['renderer']['rules'][string]>
  const renderToken: RenderRule = (tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options)
  const fenceRule = md.renderer.rules.fence ?? renderToken
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const html = fenceRule(tokens, idx, options, env, self)
    if (!html.includes('np-code-annotation')) return html
    const list = tokens[idx + 1]
    if (!list || list.type !== 'ordered_list_open') return html
    let close = idx + 2
    while (close < tokens.length && !(tokens[close].type === 'ordered_list_close' && tokens[close].level === list.level)) close += 1
    if (close >= tokens.length) return html
    const tips: Record<string, string> = {}
    let number = Number(list.attrGet('start') ?? 1)
    for (let i = idx + 2; i < close; i++) {
      if (tokens[i].type !== 'list_item_open' || tokens[i].level !== list.level + 1) continue
      let itemClose = i + 1
      while (itemClose < close && !(tokens[itemClose].type === 'list_item_close' && tokens[itemClose].level === tokens[i].level)) itemClose += 1
      tips[String(number)] = self.render(tokens.slice(i + 1, itemClose), options, env).trim()
      number += 1
      i = itemClose
    }
    for (let i = idx + 1; i <= close; i++) tokens[i].type = 'np_annotation_list'
    const encoded = Buffer.from(JSON.stringify(tips), 'utf-8').toString('base64')
    return html.replace('<pre ', `<pre data-annotations="${encoded}" `)
  }
  md.renderer.rules.np_annotation_list = () => ''
  const linkRule = md.renderer.rules.link_open ?? renderToken
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href')
    if (href) tokens[idx].attrSet('href', joinBase(base, href))
    const title = tokens[idx].attrGet('title')
    if (title) {
      tokens[idx].attrs = (tokens[idx].attrs ?? []).filter(([name]) => name !== 'title')
      tokens[idx].attrJoin('class', 'np-tip')
      tokens[idx].attrSet('aria-label', title)
    }
    return linkRule(tokens, idx, options, env, self)
  }
  const imageRule = md.renderer.rules.image ?? renderToken
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const src = token.attrGet('src')
    if (src) {
      const theme = /#only-(light|dark)$/.exec(src)
      if (theme) {
        token.attrSet('src', joinBase(base, src.slice(0, -theme[0].length)))
        token.attrJoin('class', `np-img-${theme[1]}`)
      } else {
        token.attrSet('src', joinBase(base, src))
      }
    }
    const align = token.attrGet('align')
    if (align === 'left' || align === 'right') {
      token.attrs = (token.attrs ?? []).filter(([name]) => name !== 'align')
      token.attrJoin('class', `np-img-${align}`)
    }
    const state = env as { imageCount?: number }
    state.imageCount = (state.imageCount ?? 0) + 1
    if (state.imageCount > 1 && !token.attrGet('loading')) token.attrSet('loading', 'lazy')
    const html = imageRule(tokens, idx, options, env, self)
    const caption = token.meta?.figure ? token.attrGet('title') : null
    return caption ? `${html}<figcaption class="np-figcaption">${md.utils.escapeHtml(caption)}</figcaption>` : html
  }

  md.use(anchor, {
    slugify,
    permalink: anchor.permalink.headerLink({ safariReaderFix: true })
  })
  md.use(attrs)
  md.use(deflist)
  md.use(footnote)
  md.use(taskLists, { enabled: true })
  md.use(mark)
  md.inline.ruler.before('emphasis', 'np_ins', insRule)
  md.renderer.rules.s_open = () => '<del>'
  md.renderer.rules.s_close = () => '</del>'
  md.use(sub)
  md.use(sup)
  md.inline.ruler.before('emphasis', 'np_keys', keysRule)
  md.core.ruler.push('np_figures', figuresRule)
  md.block.ruler.before('reference', 'np_abbr_definition', abbrDefinitionRule, { alt: ['paragraph', 'reference', 'blockquote', 'list'] })
  md.core.ruler.after('inline', 'np_abbr', makeAbbrRule(features.glossary ?? []))
  md.core.ruler.push('np_glossary_anchors', glossaryAnchorRule)
  md.core.ruler.after('footnote_tail', 'np_footnote_tips', footnoteTipsRule)
  const footnoteRefRule = md.renderer.rules.footnote_ref ?? renderToken
  md.renderer.rules.footnote_ref = (tokens, idx, options, env, self) => {
    const tip = String(tokens[idx].meta?.tip ?? '')
    const html = footnoteRefRule(tokens, idx, options, env, self)
    return tip ? html.replace('<sup class="footnote-ref">', `<sup class="footnote-ref np-tip" aria-label="${md.utils.escapeHtml(tip)}">`) : html
  }
  md.inline.ruler.before('emphasis', 'np_icon', makeIconRule(features.icons))
  md.use(emoji)
  md.renderer.rules.np_icon = (tokens, idx, _options, _env, self) => `<span${self.renderAttrs(tokens[idx])}>${tokens[idx].content}</span>`
  if (features.math !== false) {
    md.block.ruler.before('fence', 'np_math_block', mathBlockRule, { alt: ['paragraph', 'reference', 'blockquote', 'list'] })
    md.inline.ruler.before('emphasis', 'np_math_inline', mathInlineRule)
    md.renderer.rules.np_math_block = (tokens, idx) => `<div class="np-math np-math-display" data-math="${encodeMath(tokens[idx].content)}"></div>\n`
    md.renderer.rules.np_math_inline = (tokens, idx) => `<span class="np-math" data-math="${encodeMath(tokens[idx].content)}"></span>`
  }

  const useContainer = (name: string, opts: ContainerOpts) => {
    ;(md.use as (...args: unknown[]) => MarkdownIt)(container, name, opts)
  }

  const calloutTypes = [
    'tip', 'note', 'warning', 'info', 'check',
    'abstract', 'success', 'question', 'failure', 'danger', 'bug', 'example', 'quote'
  ]
  const sentenceCase = (word: string) => word[0].toUpperCase() + word.slice(1)
  const calloutOptions = (info: string, type: string) => {
    const rest = info.trim().slice(type.length).trim()
    const payloadAt = rest.indexOf('{')
    const options = payloadAt >= 0 ? safeParseJson(rest.slice(payloadAt), info) : {}
    const rawTitle = (payloadAt >= 0 ? rest.slice(0, payloadAt) : rest).trim()
    return {
      title: rawTitle === '""' ? '' : rawTitle || sentenceCase(type),
      collapsible: options.collapsible === true,
      open: options.open === true,
      inline: options.inline === 'start' || options.inline === 'end' ? options.inline : ''
    }
  }
  const openingToken = (tokens: ContainerToken[], idx: number, type: string) => {
    let depth = 0
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === `container_${type}_close`) depth++
      else if (tokens[i].type === `container_${type}_open`) {
        if (depth === 0) return tokens[i]
        depth--
      }
    }
    return tokens[idx]
  }
  for (const type of calloutTypes) {
    useContainer(type, {
      render(tokens, idx) {
        if (tokens[idx].nesting !== 1) {
          return calloutOptions(openingToken(tokens, idx, type).info, type).collapsible ? '</div></details>' : '</div></div>'
        }
        const { title, collapsible, open, inline } = calloutOptions(tokens[idx].info, type)
        const classes = `np-callout np-callout-${type}${collapsible ? ' np-callout-collapsible' : ''}${inline ? ` np-callout-inline np-callout-inline-${inline}` : ''}`
        if (collapsible) {
          return `<details class="${classes}"${open ? ' open' : ''}><summary class="np-callout-title">${md.utils.escapeHtml(title || sentenceCase(type))}</summary><div class="np-callout-body">`
        }
        const titleRow = title ? `<div class="np-callout-title">${md.utils.escapeHtml(title)}</div>` : ''
        return `<div class="${classes}"><div class="np-callout-body">${titleRow}`
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

  useContainer('tabs', {
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        const json = tokens[idx].info.trim().slice('tabs'.length).trim()
        const data = json ? safeParseJson(json, tokens[idx].info) : {}
        return `<div class="np-tabs"${data.linked === true ? ' data-linked="true"' : ''}>`
      }
      return '</div>'
    }
  })

  md.core.ruler.before('inline', 'nimpress_tabs', (state) => {
    const tokens = state.tokens
    const panelOpen: boolean[] = []
    const htmlToken = (html: string) => {
      const token = new state.Token('html_block', '', 0)
      token.content = html
      token.block = true
      return token
    }
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type === 'container_tabs_open') {
        panelOpen.push(false)
        continue
      }
      if (token.type === 'container_tabs_close') {
        if (panelOpen.pop()) tokens.splice(i++, 0, htmlToken('</div>'))
        continue
      }
      if (panelOpen.length === 0 || token.type !== 'paragraph_open') continue
      const inline = tokens[i + 1]
      const marker = inline?.type === 'inline' ? inline.content.match(/^::tab[ \t]+(.+?)[ \t]*(?:\n([\s\S]*))?$/) : null
      if (!marker) continue
      const label = marker[1]
      const closer = panelOpen[panelOpen.length - 1] ? '</div>' : ''
      const opener = htmlToken(
        `${closer}<div class="np-tabs-panel" data-label="${md.utils.escapeHtml(label)}" data-id="tab-${slugify(label)}">`
      )
      panelOpen[panelOpen.length - 1] = true
      if (marker[2] === undefined) {
        tokens.splice(i, 3, opener)
      } else {
        inline.content = marker[2]
        tokens.splice(i, 0, opener)
        i++
      }
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

  useContainer('component', {
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        const info = tokens[idx].info.trim().slice('component'.length).trim()
        const data = info.startsWith('{')
          ? safeParseJson(info, tokens[idx].info)
          : info
            ? { component: info }
            : {}
        const payload = encodeAttr(JSON.stringify({ ...embed, ...data }))
        return `<div class="np-component-embed" data-embed="${payload}"><div class="np-component-embed-body">`
      }
      return '</div></div>'
    }
  })

  return md
}

const ANNOTATION_MARKER = /\((\d+)\)(!?)[ \t]*$/m

type CodeFenceOptions = { title: string; lines: boolean; start: number; highlight: Set<number> }

function parseLineRanges(value: unknown): Set<number> {
  const lines = new Set<number>()
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : typeof value === 'number' ? [value] : []
  for (const part of parts) {
    const text = String(part).trim()
    const range = /^(\d+)(?:-(\d+))?$/.exec(text)
    if (!range) continue
    const from = Number(range[1])
    const to = range[2] ? Number(range[2]) : from
    for (let line = from; line <= to; line++) lines.add(line)
  }
  return lines
}

function parseCodeFenceOptions(attrs: string): CodeFenceOptions {
  const payloadAt = attrs.indexOf('{')
  const raw = payloadAt >= 0 ? safeParseJson(attrs.slice(payloadAt), attrs) : {}
  const start = typeof raw.start === 'number' && Number.isInteger(raw.start) ? raw.start : 1
  return {
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    lines: raw.lines === true || typeof raw.start === 'number',
    start,
    highlight: parseLineRanges(raw.highlight)
  }
}

function codeFenceAttrs(display: string, fence: CodeFenceOptions): Record<string, string> {
  const attrs: Record<string, string> = { 'data-lang': display }
  if (fence.title) attrs['data-title'] = fence.title
  if (fence.lines) {
    attrs['data-lines'] = 'true'
    attrs['data-start'] = String(fence.start)
  }
  return attrs
}

function isCommentToken(token: ThemedToken): boolean {
  const explanation = token.explanation ?? []
  return (
    explanation.length > 0 &&
    explanation.every(
      (entry) =>
        entry.scopes.some((scope) => /(^|\.)comment(\.|$)/.test(scope.scopeName)) &&
        !entry.scopes.some((scope) => scope.scopeName.startsWith('markup.fenced_code') || scope.scopeName.startsWith('markup.raw'))
    )
  )
}

function annotateLine(line: ThemedToken[]): ThemedToken[] {
  let first = line.length
  while (first > 0 && isCommentToken(line[first - 1])) first -= 1
  if (first === line.length) return line
  const pieces = line.slice(first).flatMap((token) =>
    (token.explanation ?? []).map((entry) => ({
      text: entry.content,
      punctuation: entry.scopes.some((scope) => scope.scopeName.startsWith('punctuation.definition.comment')),
      color: token.color,
      fontStyle: token.fontStyle
    }))
  )
  let markerAt = pieces.length - 1
  while (markerAt >= 0 && (pieces[markerAt].punctuation || !pieces[markerAt].text.trim())) markerAt -= 1
  if (markerAt < 0) return line
  const match = ANNOTATION_MARKER.exec(pieces[markerAt].text)
  if (!match) return line
  const strip = match[2] === '!'
  pieces[markerAt].text = pieces[markerAt].text.slice(0, match.index)
  const marker: ThemedToken = {
    content: '',
    offset: line[first].offset,
    htmlAttrs: { class: 'np-code-annotation', 'data-annotation': match[1], role: 'button', tabindex: '0' }
  }
  const kept = strip
    ? pieces.map((piece) => (piece.punctuation ? { ...piece, text: /^\s*/.exec(piece.text)?.[0] ?? '' } : piece))
    : pieces
  const before = kept.slice(0, markerAt + 1).filter((piece) => piece.text)
  const after = kept.slice(markerAt + 1).filter((piece) => piece.text.trim())
  const toToken = (piece: { text: string; color?: string; fontStyle?: number }): ThemedToken => ({
    content: piece.text,
    offset: line[first].offset,
    color: piece.color,
    fontStyle: piece.fontStyle
  })
  return [...line.slice(0, first), ...before.map(toToken), marker, ...after.map(toToken)]
}

function codeFenceTransformer(preAttrs: Record<string, string>, fence: CodeFenceOptions): ShikiTransformer {
  return {
    name: 'nimpress:code-fence',
    tokens(tokens) {
      return tokens.map(annotateLine)
    },
    pre(node) {
      for (const [key, value] of Object.entries(preAttrs)) node.properties[key] = value
    },
    code(node) {
      if (fence.lines) node.properties.style = `counter-reset:np-line ${fence.start - 1}`
    },
    line(node, lineNumber) {
      if (fence.highlight.has(lineNumber)) this.addClassToHast(node, 'np-code-line-highlight')
    }
  }
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

function mermaidPlaceholder(body: string): string {
  const encoded = Buffer.from(body, 'utf-8').toString('base64')
  return `<div class="np-mermaid" data-graph="${encoded}"></div>`
}

function dbmlPlaceholder(body: string, info: string, file: string): string {
  const options = info.startsWith('{') ? safeParseJson(info, info) : {}
  let payload = ''
  let failure = ''
  try {
    payload = dbmlToErdJson(body)
  } catch (err) {
    failure = err instanceof DbmlError ? err.message : String(err)
    console.warn(`[nimpress] invalid dbml in ${file}:\n${failure}`)
  }
  const encoded = Buffer.from(payload, 'utf-8').toString('base64')
  const height = typeof options.height === 'string' ? options.height : ''
  const attrs = [
    `data-schema="${encoded}"`,
    failure ? `data-error="${encodeAttr(failure)}"` : '',
    height ? `data-height="${encodeAttr(height)}"` : ''
  ]
    .filter(Boolean)
    .join(' ')
  return `<div class="np-dbml" ${attrs}></div>`
}

function rewriteDiagramFences(source: string, file: string): string {
  const lines = source.split('\n')
  const out: string[] = []
  let cursor = 0
  while (cursor < lines.length) {
    const open = /^(\s*)(`{3,}|~{3,})(.*)$/.exec(lines[cursor])
    if (!open) {
      out.push(lines[cursor])
      cursor += 1
      continue
    }
    const [, indent, marker, rest] = open
    const closing = new RegExp(`^\\s*\\${marker[0]}{${marker.length},}\\s*$`)
    let end = cursor + 1
    while (end < lines.length && !closing.test(lines[end])) end += 1
    const info = rest.trim()
    const lang = info.split(/\s+/)[0].toLowerCase()
    const body = lines.slice(cursor + 1, end).join('\n')
    if (lang === 'mermaid') {
      out.push(`${indent}${mermaidPlaceholder(body ? `${body}\n` : body)}`)
    } else if (lang === 'dbml') {
      out.push(`${indent}${dbmlPlaceholder(body, info.slice(lang.length).trim(), file)}`)
    } else {
      out.push(...lines.slice(cursor, Math.min(end + 1, lines.length)))
    }
    cursor = end + 1
  }
  return out.join('\n')
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
  let glossaryTerms: GlossaryTerm[] = []
  let glossaryStamp = ''
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

  function parseSpecText(raw: string, file: string): unknown {
    return /\.ya?ml$/i.test(file) ? parseYamlText(raw) : JSON.parse(raw)
  }

  async function loadSpec(mdFile: string, specRef: string): Promise<unknown | null> {
    try {
      const target = isAbsolute(specRef)
        ? specRef
        : resolve(dirname(mdFile), specRef)
      const raw = await readFile(target, 'utf-8')
      const top = parseSpecText(raw, target) as any
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
      return parseSpecText(raw, absPath)
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
    if (typeof data.type === 'number') data.type = String(data.type)

    const issues = frontmatterIssues(data, content)
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
    const linkTo = typeof fm.link === 'string' && fm.link.trim() !== '' ? fm.link.trim() : undefined
    const sidebarOnly = !!linkTo || ((data as Record<string, unknown>).type === undefined && content.trim() === '')

    const defaults = resolved.defaultFrontmatter ?? {}
    const defaultExcludes = resolved.defaultFrontmatterExclude ?? []
    const isExcludedFromDefaults = defaultExcludes.some((prefix) => {
      const p = prefix.startsWith('/') ? prefix : '/' + prefix
      return effectivePath === p || effectivePath.startsWith(p + '/')
    })
    if (!isExcludedFromDefaults) {
      for (const [key, value] of Object.entries(defaults)) {
        const k = key as keyof Frontmatter
        if (k === 'hide') {
          fm.hide = Array.from(new Set([...((value as PageElement[] | undefined) ?? []), ...(fm.hide ?? [])]))
        } else if (fm[k] === undefined || fm[k] === null || fm[k] === '') {
          ;(fm as unknown as Record<string, unknown>)[k] = value
        }
      }
    }

    const hl = await ensureHighlighter()
    const md = buildMarkdownIt(hl, embedContext(), resolved.base, { math: resolved.math, icons: resolved.icons, glossary: glossaryTerms })
    const prepared = rewriteDiagramFences(content, file)
    const headings = collectHeadings(md, prepared)
    const html = md.render(prepared, { glossaryPage: type === 'glossary' })
    if (type === 'team' || type === 'pricing') {
      const data = { ...((fm.data ?? {}) as Record<string, unknown>) }
      if (Array.isArray(data.members)) {
        data.members = (data.members as Array<Record<string, unknown>>).map((member) => ({ ...member, bioHtml: typeof member.bio === 'string' ? md.renderInline(member.bio) : '' }))
      }
      if (Array.isArray(data.tiers)) {
        data.tiers = (data.tiers as Array<Record<string, unknown>>).map((tier) => ({ ...tier, benefitsHtml: Array.isArray(tier.benefits) ? (tier.benefits as unknown[]).map((benefit) => md.renderInline(String(benefit))) : [] }))
      }
      if (typeof data.footnote === 'string') data.footnoteHtml = md.renderInline(data.footnote)
      fm.data = data
    }

    let openApiSpec: unknown | undefined
    let openApiFile: string | undefined
    let openApiUrl: string | undefined
    let specPath: string | undefined
    if (type === 'openapi') {
      if (!fm.spec) {
        console.warn(`[nimpress] page ${file} has type openapi but no spec field`)
      } else {
        specPath = isAbsolute(fm.spec) ? fm.spec : resolve(dirname(file), fm.spec)
        openApiFile = basename(specPath)
        openApiUrl = contentUrl(contentRoot, specPath)
        const raw = await loadSpec(file, fm.spec)
        openApiSpec = raw ? flattenSpecForEmbed(raw, md) ?? undefined : undefined
      }
    }

    let dbmlSchema: string | undefined
    let dbmlSource: string | undefined
    let dbmlFile: string | undefined
    let dbmlError: string | undefined
    if (type === 'dbml') {
      if (!fm.spec) {
        console.warn(`[nimpress] page ${file} has type dbml but no spec field`)
      } else {
        specPath = isAbsolute(fm.spec) ? fm.spec : resolve(dirname(file), fm.spec)
        dbmlFile = basename(specPath)
        try {
          dbmlSource = await readFile(specPath, 'utf-8')
          dbmlSchema = dbmlToErdJson(dbmlSource)
        } catch (err) {
          dbmlError = err instanceof DbmlError ? err.message : String(err)
          const detail = `${file} -> ${fm.spec}\n  ${dbmlError}`
          if (isBuildCommand) throw new Error(`[nimpress] invalid dbml in ${detail}`)
          console.warn(`[nimpress] invalid dbml in ${detail}`)
        }
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
    const cssParts: string[] = []
    if (cssFile !== file && existsSync(cssFile)) {
      cssParts.push(await readFile(cssFile, 'utf-8'))
    }
    const stem = basename(file, '.md')
    for (const sibling of readdirSync(dirname(file)).sort()) {
      const root = componentCssRoot(sibling, stem)
      if (root) cssParts.push(scopeCss(root, await readFile(join(dirname(file), sibling), 'utf-8')))
    }
    for (const extra of fm.styles ?? []) {
      const target = resolve(dirname(file), extra)
      if (existsSync(target)) cssParts.push(await readFile(target, 'utf-8'))
      else console.warn(`[nimpress] ${file}: styles entry ${extra} does not resolve`)
    }
    if (cssParts.length) pageCss = cssParts.join('\n')

    return {
      slug,
      filePath: file,
      effectivePath,
      type,
      sidebarOnly,
      linkTo,
      frontmatter: fm,
      html,
      headings,
      rawText: content,
      pageCss,
      openApiSpec,
      openApiFile,
      openApiUrl,
      componentData,
      dbmlSchema,
      dbmlSource,
      dbmlFile,
      dbmlError
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
    const hash = hashContent(raw + glossaryStamp)
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

  function embedContext(): { route: string; system?: string } {
    const names = Object.keys(resolved.modules.systems)
    return {
      route: resolved.modules.route.replace(/\/$/, ''),
      system: names.length === 1 ? names[0] : undefined
    }
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
    let notFoundPage: string | undefined
    let tagsPage: string | undefined
    const allProcessed: ProcessedPage[] = []

    const glossaryFiles: string[] = []
    let terms: GlossaryTerm[] = []
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      let raw = ''
      try {
        raw = await readFile(file, 'utf-8')
      } catch {
        continue
      }
      const { data, content } = matter(raw)
      if (String(data.type) !== 'glossary') continue
      glossaryFiles.push(file)
      terms = extractGlossary(new MarkdownIt().use(deflist), content)
    }
    if (glossaryFiles.length > 1) throw new Error(`[nimpress] one type glossary page per site: ${glossaryFiles.join(' and ')}`)
    glossaryTerms = terms
    glossaryStamp = JSON.stringify(terms)
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
      if (p.type === 'section' && !p.filePath.endsWith(`${sep}index.md`)) {
        throw new Error(`[nimpress] type section belongs on a folder index.md: ${p.filePath}`)
      }
      if (p.type === 'glossary' && !p.html.includes('<dl')) {
        throw new Error(`[nimpress] type glossary needs a definition list body: ${p.filePath}`)
      }
      if (p.type === 'tags') {
        if (tagsPage && tagsPage !== p.filePath) {
          throw new Error(`[nimpress] one type tags page per site: ${tagsPage} and ${p.filePath}`)
        }
        tagsPage = p.filePath
      }
      if (p.type === '404') {
        if (notFoundPage && notFoundPage !== p.filePath) {
          throw new Error(`[nimpress] one type 404 page per site: ${notFoundPage} and ${p.filePath}`)
        }
        notFoundPage = p.filePath
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

    changelogEntryMarkdown.clear()
    for (const [groupKey, entries] of changelogGroups) {
      const parent = groupKey.split('\u0000', 1)[0]
      const path = normalizePath(parent ? '/' + parent : '/')
      if (pathToFile.has(path)) {
        throw new Error(
          `[nimpress] path ${path} is occupied by both a changelog collection and a regular page`
        )
      }
      const visible = entries.filter((e) => !(isBuildCommand && pageExcludedFromBuild(e.frontmatter)))
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
        const entrySlug = version ? `v${version}` : 'unreleased'
        changelogEntryMarkdown.set(`${mergedSlug}#${entrySlug}`, e.rawText)
        return {
          version,
          slug: entrySlug,
          title: entryTitle,
          description: entryDescription,
          releaseDate,
          hidden: pageDevOnly(e.frontmatter),
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

    buildSubscribeMap(result)

    pages = result
  }

  const feedFiles = new Map<string, string>()

  const changelogEntryMarkdown = new Map<string, string>()

  let subscribeMapJson = JSON.stringify({ pages: [] }, null, 2) + '\n'

  function buildSubscribeMap(result: Map<string, ProcessedPage>): void {
    const mapPages: SubscribeMapPage[] = []
    for (const p of result.values()) {
      if (p.frontmatter.subscribe !== true) continue
      if (pageHiddenEverywhere(p.frontmatter)) continue
      const basePath = p.effectivePath === '/' ? '' : p.effectivePath
      const gatedPrefix = isGated(p) ? `/${resolved.paths.guarded}/${bundleFor(p)}` : ''
      const feed = `${gatedPrefix}${basePath}/${feedFileName(0)}`
      if (!feedFiles.has(feed)) continue
      const page: SubscribeMapPage = {
        path: p.effectivePath,
        title: p.frontmatter.title,
        name: p.effectivePath === '/' ? 'index' : p.effectivePath.replace(/\//g, '-').replace(/^-/, ''),
        feed
      }
      if (p.type === 'changelog') {
        page.entries = (p.changelogEntries ?? [])
          .filter((e) => !e.hidden)
          .map((e) => ({
            slug: e.slug,
            version: e.version,
            date: e.releaseDate,
            title: e.title,
            description: e.description,
            body: changelogEntryMarkdown.get(`${p.slug}#${e.slug}`) ?? ''
          }))
      }
      mapPages.push(page)
    }
    mapPages.sort((a, b) => a.path.localeCompare(b.path))
    subscribeMapJson = JSON.stringify({ pages: mapPages }, null, 2) + '\n'
  }

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
      const pageUrl = `${siteUrl}${joinBase(resolved.base, basePath || '/')}`
      const gatedPrefix = isGated(p) ? `/${resolved.paths.guarded}/${bundleFor(p)}` : ''
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
          `<atom:link href="${xmlEscape(`${siteUrl}${joinBase(resolved.base, feedPath(index))}`)}" rel="self" type="application/rss+xml"/>`
        ]
        if (index > 0) {
          links.push(
            `<atom:link href="${xmlEscape(`${siteUrl}${joinBase(resolved.base, feedPath(0))}`)}" rel="current" type="application/rss+xml"/>`
          )
        }
        if (index + 1 < pageCount) {
          links.push(
            `<atom:link href="${xmlEscape(`${siteUrl}${joinBase(resolved.base, feedPath(index + 1))}`)}" rel="prev-archive" type="application/rss+xml"/>`
          )
        }
        if (index > 1) {
          links.push(
            `<atom:link href="${xmlEscape(`${siteUrl}${joinBase(resolved.base, feedPath(index - 1))}`)}" rel="next-archive" type="application/rss+xml"/>`
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
    return p.frontmatter.gate !== undefined
  }

  function relatedFilesFor(p: ProcessedPage): string[] {
    const dir = dirname(p.filePath)
    let entries: string[] = []
    try {
      entries = readdirSync(dir)
    } catch {
      return []
    }
    return entries
      .filter((name) => join(dir, name) !== p.filePath)
      .map((name) => relative(process.cwd(), join(dir, name)))
  }

  function bundleFor(p: ProcessedPage): string {
    const guard = resolved.auth?.guard
    if (typeof guard === 'function') {
      return guard(p.frontmatter, relative(process.cwd(), p.filePath), relatedFilesFor(p))
    }
    return p.frontmatter.gate ?? 'default'
  }

  function publicPages(): ProcessedPage[] {
    const out: ProcessedPage[] = []
    for (const p of pages.values()) {
      if (p.sidebarOnly) continue
      if (pageHiddenEverywhere(p.frontmatter)) continue
      if (isGated(p)) continue
      out.push(p)
    }
    return out
  }

  function siteAbsolute(path: string): string | undefined {
    const origin = resolved.site?.url?.replace(/\/$/, '')
    if (!origin) return undefined
    return origin + joinBase(resolved.base, path.startsWith('/') ? path : '/' + path)
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
    if (type === 'hero' || type === 'fullpage' || type === '404') return 'WebPage'
    if (type === 'section' || type === 'tags') return 'CollectionPage'
    if (type === 'glossary') return 'DefinedTermSet'
    if (type === 'team') return 'AboutPage'
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
    const ogType = og.type ?? (fm.type === 'hero' || fm.type === 'fullpage' || p.effectivePath === '/' ? 'website' : 'article')
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
        '@id': `${siteUrl}${joinBase(resolved.base, '/')}#website`,
        name: site.title,
        url: `${siteUrl}${joinBase(resolved.base, '/')}`,
        description: site.description
      })
    }
    if (canonical && p.effectivePath !== '/') {
      const crumbs: { name: string; item?: string }[] = [
        { name: site?.title ?? 'Home', item: siteUrl ? `${siteUrl}${joinBase(resolved.base, '/')}` : undefined }
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
      isPartOf: siteUrl ? `${siteUrl}${joinBase(resolved.base, '/')}#website` : undefined,
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
      const loc = `${siteUrl}${joinBase(resolved.base, p.effectivePath === '/' ? '/' : p.effectivePath)}`
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
    const indexed = list.filter((p) => p.type !== '404')
    const sitemap = buildSitemap(indexed)
    if (sitemap) await writeFile(join(resolvedOutDir, 'sitemap.xml'), sitemap)
    await writeFile(join(resolvedOutDir, 'llms.txt'), buildLlms(indexed))
    if (metaCfg.llms?.full) {
      await writeFile(join(resolvedOutDir, 'llms-full.txt'), buildLlmsFull(indexed))
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

  async function writeGuardedArtifacts(): Promise<void> {
    const gated = [...pages.values()].filter((p) => !pageHiddenEverywhere(p.frontmatter) && isGated(p))
    const accessRoutes: Record<string, { gate?: string; bundle: string }> = {}
    const byBundle = new Map<string, ProcessedPage[]>()
    for (const p of gated) {
      const bundle = bundleFor(p)
      accessRoutes[p.effectivePath] = { gate: p.frontmatter.gate, bundle }
      const list = byBundle.get(bundle) ?? []
      list.push(p)
      byBundle.set(bundle, list)
    }
    const guardedPrefix = `/${resolved.paths.guarded}/`
    await writeFile(
      join(resolvedOutDir, 'access.json'),
      JSON.stringify({ prefix: guardedPrefix, routes: accessRoutes }, null, 2) + '\n'
    )
    if (gated.length === 0) return
    const root = join(resolvedOutDir, resolved.paths.guarded)
    const mapBundles: Record<string, { pages: Record<string, string>; files: string[] }> = {}
    for (const [bundle, list] of byBundle) {
      const dir = join(root, bundle)
      await mkdir(join(dir, 'body'), { recursive: true })
      const styles: Record<string, string> = {}
      const shells = list.map((p) => ({
        slug: p.slug,
        path: p.effectivePath,
        type: p.type,
        frontmatter: p.frontmatter,
        bundle
      }))
      const files: string[] = [`${bundle}/manifest.json`, `${bundle}/search.json`]
      for (const p of list) {
        if (p.pageCss) styles[p.effectivePath] = [styles[p.effectivePath], p.pageCss].filter(Boolean).join('\n')
        const body = {
          html: p.html,
          headings: p.headings,
          openApiSpec: p.openApiSpec,
          openApiFile: p.openApiFile,
          openApiUrl: p.openApiUrl,
          changelogEntries: p.changelogEntries,
          roadmapEntries: p.roadmapEntries,
          componentData: p.componentData,
          dbmlSchema: p.dbmlSchema,
          dbmlSource: p.dbmlSource,
          dbmlFile: p.dbmlFile,
          dbmlError: p.dbmlError
        }
        const bodyFile = join(dir, 'body', `${urlSlug(p.slug)}.json`)
        await mkdir(dirname(bodyFile), { recursive: true })
        await writeFile(bodyFile, JSON.stringify(body))
        files.push(`${bundle}/body/${urlSlug(p.slug)}.json`)
      }
      await writeFile(
        join(dir, 'manifest.json'),
        JSON.stringify({ shells, styles, sidebar: buildSidebar(true) })
      )
      await writeFile(join(dir, 'search.json'), JSON.stringify(buildSearch(true, list)))
      mapBundles[bundle] = {
        pages: Object.fromEntries(list.map((p) => [p.effectivePath, p.frontmatter.gate ?? ''])),
        files
      }
    }
    await writeFile(
      join(resolvedOutDir, 'guard.map.json'),
      JSON.stringify({ prefix: guardedPrefix, routes: accessRoutes, bundles: mapBundles }, null, 2) + '\n'
    )
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
          hidden: pageDevOnly(e.frontmatter),
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

  function resolveIconRef(icon: string | undefined, fromFile: string): string | undefined {
    const shortcode = icon ? /^:([a-z0-9]+(?:-[a-z0-9]+)*):$/.exec(icon.trim()) : null
    if (shortcode) {
      const svg = loadIconSvg(shortcode[1], resolved.icons)
      if (!svg) console.warn(`[nimpress] icon ${icon} referenced from ${fromFile} is not a known shortcode`)
      return svg ?? undefined
    }
    if (!icon || !/\.svg$/i.test(icon.trim())) return icon
    const ref = icon.trim()
    const target = ref.startsWith('/') ? join(contentRoot, ref) : resolve(dirname(fromFile), ref)
    try {
      return readFileSync(target, 'utf8').trim()
    } catch {
      console.warn(`[nimpress] sidebar icon ${ref} referenced from ${fromFile} is not readable`)
      return undefined
    }
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
      if (isBuildCommand && (pageExcludedFromBuild(p.frontmatter) || (!includeGated && isGated(p)))) continue
      if (p.type === '404' && !p.frontmatter.sidebar?.name) continue
      const sidebarMeta = p.frontmatter.sidebar
      if (p.effectivePath === '/' && !sidebarMeta?.name) continue
      const segments = p.effectivePath === '/'
        ? [sidebarMeta!.path ?? sidebarMeta!.name]
        : p.effectivePath.split('/').filter(Boolean)
      const isFolderIndex = p.filePath.endsWith(`${sep}index.md`)
      if (sidebarMeta?.name && isFolderIndex) {
        const own = '/' + segments.join('/')
        dirMeta.set(own, {
          label: sidebarMeta.name,
          icon: resolveIconRef(sidebarMeta.icon, p.filePath) ?? dirMeta.get(own)?.icon,
          style: sidebarMeta.style ?? dirMeta.get(own)?.style
        })
      }
      if (p.sidebarOnly && !p.linkTo) continue
      const groupSeg = isFolderIndex ? undefined : (sidebarMeta?.path ?? sidebarMeta?.name)
      if (groupSeg && segments[segments.length - 2] !== groupSeg) {
        if (segments.length >= 3) segments.splice(segments.length - 2, 1, groupSeg)
        else segments.splice(segments.length - 1, 0, groupSeg)
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
      if (!isFolderIndex && sidebarMeta?.name) {
        const target = '/' + segments.slice(0, -1).join('/')
        dirMeta.set(target, {
          label: sidebarMeta.name,
          icon: resolveIconRef(sidebarMeta.icon, p.filePath) ?? dirMeta.get(target)?.icon,
          style: sidebarMeta.style ?? dirMeta.get(target)?.style
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
          link: t.page.linkTo ?? t.page.effectivePath,
          external: t.page.linkTo ? true : undefined,
          slug: t.page.slug,
          gate: t.page.frontmatter.gate,
          order: t.page.frontmatter.order,
          collapsed: t.page.frontmatter.collapsed,
          hidden: pageDevOnly(t.page.frontmatter),
          status: t.page.frontmatter.status
        }
        const ownMeta = dirMeta.get(t.fullPath)
        if (ownMeta?.label) node.text = ownMeta.label
        if (ownMeta?.icon && !node.icon) node.icon = ownMeta.icon
        if (ownMeta?.style) node.style = ownMeta.style
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
              icon: issueKindIcon[e.kind],
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
            text: story.sidebar?.name ?? story.name,
            link: `${t.page!.effectivePath}/${storyAnchor(story.name)}`,
            slug: `${t.page!.slug}__story__${storyAnchor(story.name)}`,
            icon: resolveIconRef(story.sidebar?.icon, t.page!.filePath),
            style: story.sidebar?.style,
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

  function tagSlug(name: string): string {
    return `tag-${slugify(name)}`
  }

  function tagIcon(name: string): string | undefined {
    const icons = resolved.tags?.icons
    if (!icons) return undefined
    const icon = icons[resolved.tags?.map?.[name] ?? name] ?? icons.default
    return icon ? resolveIconRef(icon, resolve(process.cwd(), 'nimpress.config.json')) : undefined
  }

  function buildTagIndex(): ManifestTag[] {
    const index = new Map<string, ManifestTag>()
    for (const p of pages.values()) {
      if (p.sidebarOnly || p.type === '404' || p.type === 'tags') continue
      if (isBuildCommand && (pageExcludedFromBuild(p.frontmatter) || isGated(p))) continue
      for (const name of normalizeTags(p.frontmatter.tags)) {
        const entry = index.get(name) ?? { name, slug: tagSlug(name), icon: tagIcon(name), pages: [] }
        entry.pages.push({ slug: p.slug, title: p.frontmatter.title, path: p.effectivePath, description: p.frontmatter.description })
        index.set(name, entry)
      }
    }
    return Array.from(index.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((tag) => ({ ...tag, pages: tag.pages.sort((a, b) => a.title.localeCompare(b.title)) }))
  }

  function siteComponentStyles(): string {
    const dir = join(contentRoot, 'styles')
    if (!existsSync(dir)) return ''
    return readdirSync(dir)
      .filter((name) => name.endsWith('.css'))
      .sort()
      .map((name) => scopeCss(name.replace(/\.css$/, ''), readFileSync(join(dir, name), 'utf-8')))
      .join('\n')
  }

  function buildManifest() {
    const pageMap: Record<string, PageMeta> = {}
    const byPath: Record<string, string> = {}

    for (const [slug, p] of pages) {
      if (isBuildCommand && (pageExcludedFromBuild(p.frontmatter) || isGated(p))) continue
      if (p.sidebarOnly) continue
      const meta: PageMeta = {
        slug,
        path: p.effectivePath,
        type: p.type,
        title: p.frontmatter.title,
        gate: p.frontmatter.gate,
        bundle: isGated(p) ? bundleFor(p) : undefined,
        description: p.frontmatter.description,
        order: p.frontmatter.order,
        hidden: pageDevOnly(p.frontmatter),
        hide: p.type === 'fullpage' ? Array.from(new Set<PageElement>(['navigation', 'path', 'toc', 'footer', ...(p.frontmatter.hide ?? [])])) : p.frontmatter.hide,
        source: relative(contentRoot, p.filePath).split(sep).join('/'),
        tags: normalizeTags(p.frontmatter.tags),
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
    const siteStyles = siteComponentStyles()
    if (siteStyles) styles['/'] = siteStyles
    for (const p of pages.values()) {
      if (p.sidebarOnly) continue
      if (isBuildCommand && (pageExcludedFromBuild(p.frontmatter) || isGated(p))) continue
      if (p.pageCss) styles[p.effectivePath] = [styles[p.effectivePath], p.pageCss].filter(Boolean).join('\n')
    }

    return { pages: pageMap, byPath, sidebar: buildSidebar(), styles, tags: buildTagIndex(), glossary: glossaryTerms }
  }

  function buildSearch(gatedOnly = false, only?: ProcessedPage[]): SearchEntry[] {
    const out: SearchEntry[] = []
    const source: Iterable<[string, ProcessedPage]> = only
      ? only.map((p) => [p.slug, p] as [string, ProcessedPage])
      : pages
    for (const [slug, p] of source) {
      if (p.sidebarOnly) continue
      if (p.type === '404') continue
      if (gatedOnly) {
        if (pageExcludedFromBuild(p.frontmatter) || !isGated(p)) continue
      } else if (isBuildCommand && (pageExcludedFromBuild(p.frontmatter) || isGated(p))) continue
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
      const dbmlBody = p.dbmlSource ? p.dbmlSource.replace(/[{}\[\]'"`,]/g, ' ') : ''
      const body = [baseBody, specBody, roadmapBody, componentBody, dbmlBody].filter(Boolean).join(' \n ')
      out.push({
        slug,
        path: p.effectivePath,
        title: p.frontmatter.title,
        description: p.frontmatter.description,
        body,
        gate: p.frontmatter.gate,
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
      const bodyId = PAGE_BODY_PREFIX + urlSlug(slug) + '.js'
      const compId = PAGE_COMPONENT_PREFIX + urlSlug(slug) + '.svelte'
      const b = dev.moduleGraph.getModuleById(bodyId)
      const c = dev.moduleGraph.getModuleById(compId)
      if (b) dev.moduleGraph.invalidateModule(b)
      if (c) dev.moduleGraph.invalidateModule(c)
    }
  }

  function buildPagesEntry(): string {
    const entries: string[] = []
    for (const [slug, p] of pages) {
      if (p.sidebarOnly) continue
      if (isBuildCommand && (pageExcludedFromBuild(p.frontmatter) || isGated(p))) continue
      const id = `${PAGE_COMPONENT_PREFIX}${urlSlug(slug)}.svelte`
      entries.push(`  ${JSON.stringify(slug)}: () => import(${JSON.stringify(id)})`)
    }
    return `export const pages = {\n${entries.join(',\n')}\n}\nexport default pages\n`
  }

  function buildBodiesEntry(): string {
    const entries: string[] = []
    for (const [slug, p] of pages) {
      if (p.sidebarOnly) continue
      if (isBuildCommand && (pageExcludedFromBuild(p.frontmatter) || isGated(p))) continue
      const id = `${PAGE_BODY_PREFIX}${urlSlug(slug)}.js`
      entries.push(`  ${JSON.stringify(slug)}: () => import(${JSON.stringify(id)})`)
    }
    return `export const bodies = {\n${entries.join(',\n')}\n}\nexport default bodies\n`
  }

  function bodyHeadings(p: ProcessedPage): Heading[] {
    if (p.type === 'tags') return [...p.headings, ...buildTagIndex().map((tag) => ({ level: 2, text: tag.name, slug: tag.slug }))]
    if (p.type === 'glossary') return [...p.headings, ...glossaryTerms.map((entry) => ({ level: 2, text: entry.term, slug: entry.slug }))]
    if (p.type === 'team') {
      const members = ((p.frontmatter.data as Record<string, unknown> | undefined)?.members ?? []) as Array<{ name?: string }>
      return [...p.headings, ...members.filter((member) => member.name).map((member) => ({ level: 2, text: String(member.name), slug: `member-${slugify(String(member.name))}` }))]
    }
    return p.headings
  }

  function buildPageBody(slug: string): string | null {
    const p = pages.get(slug)
    if (!p) return null
    const payload = {
      html: p.html,
      headings: bodyHeadings(p),
      openApiSpec: p.openApiSpec,
      openApiFile: p.openApiFile,
      openApiUrl: p.openApiUrl,
      changelogEntries: p.changelogEntries,
      roadmapEntries: p.roadmapEntries,
      componentData: p.componentData,
      dbmlSchema: p.dbmlSchema,
      dbmlSource: p.dbmlSource,
      dbmlFile: p.dbmlFile,
      dbmlError: p.dbmlError
    }
    return `export default ${JSON.stringify(payload)}\n`
  }

  function customIdent(name: string): string {
    return `Custom_${name.replace(/[^a-zA-Z0-9]/g, '_')}`
  }

  function customWebPath(file: string): string {
    return file.startsWith('/') ? file : '/' + file.replace(/^\.\//, '')
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
    const custom = Array.from(customPageTypes.entries())
    const imports = custom.map(([name, entry]) => `  import ${customIdent(name)} from ${JSON.stringify(customWebPath(entry.file))}`).join('\n')
    const renderer = (type: string, builtIn: string) => (customPageTypes.has(type) ? customIdent(type) : builtIn)
    const bodyBranches = [
      ['team', 'TeamPage'],
      ['pricing', 'PricingPage'],
      ['glossary', 'GlossaryPage'],
      ['tags', 'TagsPage'],
      ['section', 'SectionPage'],
      ['404', 'NotFoundPage'],
      ['changelog', 'ChangelogPage'],
      ['roadmap', 'RoadmapPage'],
      ['component', 'ComponentPage'],
      ['dbml', 'DbmlPage']
    ]
      .map(([type, builtIn]) => `    {:else if shell.type === ${JSON.stringify(type)}}\n      <${renderer(type, builtIn)} page={{ ...shell, ...mod.default }} />`)
      .concat(
        custom
          .filter(([name]) => !BUILT_IN_PAGE_TYPES.has(name))
          .map(([name]) => `    {:else if shell.type === ${JSON.stringify(name)}}\n      <${customIdent(name)} page={{ ...shell, ...mod.default }} />`)
      )
      .join('\n')
    return `<script lang="ts">
  import { Page, OpenApiRoot, ChangelogPage, HeroPage, FullPage, NotFoundPage, RoadmapPage, ComponentPage, DbmlPage, setPageMeta, applyPageStyles, SectionPage, TagsPage, GlossaryPage, TeamPage, PricingPage, configStore, withoutBase, resolvedRoute } from '@nimtech/nimpress'
  import type { PageBody } from '@nimtech/nimpress'
${imports}
  const shell = ${json}
  setPageMeta(shell)
  applyPageStyles(shell.path)
  const bodyPromise: Promise<{ default: PageBody }> = import(${JSON.stringify(bodyId)})
  const missing = $derived.by(() => {
    if (shell.type === '404') return null
    const config = $configStore
    const path = withoutBase($resolvedRoute?.path ?? '/').replace(/\\/$/, '') || '/'
    if (config.manifest?.byPath?.[path] !== undefined) return null
    const entry = Object.entries(config.manifest?.pages ?? {}).find(([, meta]) => meta.type === '404')
    const loader = entry ? config.pageLoader?.[entry[0]] : undefined
    return loader ? (loader as () => Promise<{ default: any }>) : null
  })
</script>

{#if missing}
  {#await missing()}
    <div class="np-page-loading" aria-busy="true"></div>
  {:then found}
    <found.default />
  {/await}
{:else if shell.type === 'hero'}
  <${renderer('hero', 'HeroPage')} page={shell} {bodyPromise} />
{:else if shell.type === 'fullpage'}
  <${renderer('fullpage', 'FullPage')} page={shell} {bodyPromise} />
{:else}
  {#await bodyPromise}
    <div class="np-page-loading" aria-busy="true"></div>
  {:then mod}
    {#if shell.type === 'openapi' && mod.default.openApiSpec}
      <OpenApiRoot spec={mod.default.openApiSpec} specFile={mod.default.openApiFile} specUrl={mod.default.openApiUrl} title={shell.frontmatter.title} frontmatter={shell.frontmatter} />
${bodyBranches}
    {:else}
      <${renderer('doc', 'Page')} page={{ ...shell, ...mod.default }} />
    {/if}
  {:catch err}
    <div class="np-page-error">Failed to load page body: {String(err)}</div>
  {/await}
{/if}
`
  }

  return {
    name: '@nimtech/nimpress:markdown',

    async config() {
      const loaded = await loadNimpressConfig(process.cwd(), inline)
      resolved = loaded.resolved
      contentRoot = resolve(process.cwd(), resolved.contentDir)
      setCustomPageTypes(process.cwd(), resolved.pageTypes ?? {})
      assetsRoot = resolve(process.cwd(), resolved.assetsDir)
      return {}
    },

    configResolved(config) {
      isBuildCommand = config.command === 'build'
      resolvedOutDir = resolve(config.root, config.build.outDir)
    },

    async buildStart() {
      await processAll()
      if (isBuildCommand) flushDiagnostics()
    },

    async closeBundle(error?: Error) {
      if (!isBuildCommand || error) return
      const src = join(resolvedOutDir, 'index.html')
      const dest = join(resolvedOutDir, '404.html')
      await copyFile(src, dest)
      await writeFile(join(resolvedOutDir, '.nojekyll'), '')
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
      await writeFile(join(resolvedOutDir, 'subscribe.map.json'), subscribeMapJson)
      await writeStaticArtifacts()
      const notFound = Array.from(pages.values()).find((p) => p.type === '404' && !pageExcludedFromBuild(p.frontmatter) && !isGated(p))
      if (notFound) {
        await copyFile(join(resolvedOutDir, notFound.effectivePath.replace(/^\//, ''), 'index.html'), join(resolvedOutDir, '404.html'))
      }
      await writeGuardedArtifacts()
    },

    configureServer(devServer) {
      server = devServer
      devServer.watcher.add(contentRoot)
      devServer.watcher.add(assetsRoot)
      for (const specPath of trackedSpecs) devServer.watcher.add(specPath)
      for (const componentPath of trackedComponents) devServer.watcher.add(componentPath)

      const onAdd = async (file: string) => {
        const underContent = file.startsWith(contentRoot)
        if (!underContent || !(file.endsWith('.md') || file.endsWith('.css') || file.match(/\.story\.tsx?$/))) return
        if (file.endsWith('.css')) dropFileCache(file.replace(/(\.[a-z0-9-]+)?\.css$/, '.md'))
        if (file.match(/\.story\.tsx?$/)) dropFileCache(join(dirname(file), 'index.md'))
        try {
          await processAll()
        } catch (err) {
          devServer.config.logger.error(String(err))
          return
        }
        invalidateMeta(devServer)
        invalidateAllBodies(devServer)
        flushDiagnostics()
        devServer.ws.send({ type: 'full-reload' })
      }
      const onUnlink = async (file: string) => {
        const underContent = file.startsWith(contentRoot)
        if (underContent && (file.endsWith('.md') || file.endsWith('.css') || file.match(/\.story\.tsx?$/))) {
          if (file.match(/\.story\.tsx?$/)) dropFileCache(join(dirname(file), 'index.md'))
          else dropFileCache(file.endsWith('.css') ? file.replace(/(\.[a-z0-9-]+)?\.css$/, '.md') : file)
          try {
            await processAll()
          } catch (err) {
            devServer.config.logger.error(String(err))
            return
          }
          invalidateMeta(devServer)
          invalidateAllBodies(devServer)
          flushDiagnostics()
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
          flushDiagnostics()
        }
      }

      const mimes: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
        '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.json': 'application/json',
        '.css': 'text/css', '.js': 'text/javascript', '.txt': 'text/plain',
        '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4'
      }
      const assetBase = resolved.assetUrlBase

      const serveFile = (root: string, rel: string, res: import('node:http').ServerResponse): boolean => {
        if (!rel || rel.endsWith('.md')) return false
        const file = join(root, decodeURIComponent(rel))
        if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return false
        res.setHeader('Content-Type', mimes[extname(file).toLowerCase()] ?? 'application/octet-stream')
        createReadStream(file).pipe(res)
        return true
      }

      devServer.middlewares.use((req, res, next) => {
        const raw = (req.url ?? '').split('?')[0]
        const url = stripBase(resolved.base, raw)
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
        if (url === '/__nimpress/schema-defaults' && req.method === 'PUT') {
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
                path?: string
                defaults?: Record<string, unknown>
              }
              const rel = String(body.path ?? '')
              const target = resolve(process.cwd(), rel)
              const okName = target.endsWith(`${sep}schema.json`) || target.endsWith(`${sep}schema.yml`)
              if (!target.startsWith(contentRoot + sep) || !okName || !existsSync(target)) {
                res.statusCode = 403
                res.end('invalid schema target')
                return
              }
              const form = target.endsWith('.yml') ? ('yml' as const) : ('json' as const)
              const parsed = parseSchemaText(await readFile(target, 'utf-8'), form)
              for (const [name, value] of Object.entries(body.defaults ?? {})) {
                const node = parsed.properties?.[name]
                if (node) node.default = value
              }
              await writeFile(target, renderSchemaText(parsed as Record<string, unknown>, form))
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
        if (url === '/subscribe.map.json') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(subscribeMapJson)
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
              path: `${url}${(req.url ?? '').includes('?') ? `?${(req.url ?? '').split('?').slice(1).join('?')}` : ''}`,
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
        const baseMatch = assetBase === '/' || url === assetBase || url.startsWith(assetBase + '/')
        if (baseMatch) {
          const stripped = assetBase === '/' ? url : url.slice(assetBase.length)
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
      const isStory = file.match(/\.story\.tsx?$/) && file.startsWith(contentRoot)
      const ownsSpec = specToMd.get(file)
      const ownsComponent = componentToMd.get(file)
      if (isPageCss) {
        dropFileCache(file.replace(/(\.[a-z0-9-]+)?\.css$/, '.md'))
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
      flushDiagnostics()
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
        const runtime = runtimeConfig(resolved)
        const inline = runtime.announce || runtime.feedback ? buildMarkdownIt(await ensureHighlighter(), embedContext(), resolved.base, { math: resolved.math, icons: resolved.icons }) : null
        if (runtime.feedback && inline) {
          runtime.feedback = {
            ...runtime.feedback,
            ratings: runtime.feedback.ratings.map((rating) => ({ ...rating, html: inline.renderInline(rating.note) }))
          }
        }
        if (runtime.announce && inline) {
          runtime.announce = { ...runtime.announce, html: inline.renderInline(runtime.announce.text) }
        }
        if (runtime.footer?.social) {
          const fromFile = resolve(process.cwd(), 'nimpress.config.json')
          runtime.footer = {
            ...runtime.footer,
            social: runtime.footer.social.map((entry) => ({ ...entry, icon: resolveIconRef(entry.icon, fromFile) ?? entry.icon }))
          }
        }
        return `export default ${JSON.stringify(runtime)}`
      }
      if (id === '\0' + VIRTUAL_MAIN) {
        const cssImports = resolved.css
          .map((href) => `import ${JSON.stringify(href.startsWith('/') ? href : '/' + href)}`)
          .join('\n')
        const clientPath = resolved.client
          ? (resolved.client.startsWith('/') ? resolved.client : '/' + resolved.client.replace(/^\.\//, ''))
          : null
        const clientImport = clientPath
          ? `import { authFunctions, subscribeFunctions, feedbackFunctions } from ${JSON.stringify(clientPath)}`
          : ''
        const clientArgs = clientPath ? ', authFunctions, subscribeFunctions, feedbackFunctions' : ''
        return `import '@nimtech/nimpress/app.css'
${cssImports}
import { createNimpressApp } from '@nimtech/nimpress'
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
    const { data, content } = matter(raw)
    if (typeof data.type === 'number') data.type = String(data.type)
    for (const issue of frontmatterIssues(data, content)) {
      problems.push(`${relative(root, file).split(sep).join('/')}: ${issue}`)
    }
  }
  return problems
}

export type { NimpressUserConfig, ResolvedNimpressConfig, NimpressBannerConfig } from './types'
