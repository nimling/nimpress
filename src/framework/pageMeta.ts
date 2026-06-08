import { configStore } from './configStore'
import type {
  Frontmatter,
  OpenGraphMeta,
  PageMetaTags,
  PageShell,
  SiteMeta,
  TwitterMeta
} from '../types'

const MANAGED = 'data-np-meta'

function upsert(selector: string, build: () => HTMLElement | null) {
  const head = document.head
  const existing = head.querySelector(`${selector}[${MANAGED}]`)
  if (existing) existing.remove()
  const el = build()
  if (!el) return
  el.setAttribute(MANAGED, 'page')
  head.appendChild(el)
}

function tag(
  name: 'meta' | 'link' | 'script',
  attrs: Record<string, string | undefined>,
  content?: string
): HTMLElement {
  const el = document.createElement(name)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === '') continue
    el.setAttribute(k, v)
  }
  if (content !== undefined) el.textContent = content
  return el
}

function clearManaged() {
  const all = document.head.querySelectorAll(`[${MANAGED}]`)
  for (const el of Array.from(all)) el.remove()
}

function readSite(): SiteMeta | undefined {
  let site: SiteMeta | undefined
  configStore.subscribe((c) => {
    site = c.site ?? (c.manifest?.site as SiteMeta | undefined) ?? { title: c.title }
  })()
  return site
}

function absoluteUrl(path: string | undefined, site?: SiteMeta): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//.test(path)) return path
  if (!site?.url) return path
  const base = site.url.replace(/\/$/, '')
  return base + (path.startsWith('/') ? path : '/' + path)
}

export function setPageMeta(shell: PageShell) {
  if (typeof document === 'undefined') return
  const fm = shell.frontmatter
  const site = readSite()
  applyPageMeta(fm, shell.path, site)
}

export function applyPageMeta(
  fm: Frontmatter,
  pagePath: string,
  site?: SiteMeta
) {
  if (typeof document === 'undefined') return

  clearManaged()

  const meta: PageMetaTags = fm.meta ?? {}
  const og: OpenGraphMeta = meta.og ?? {}
  const tw: TwitterMeta = meta.twitter ?? {}

  const title = fm.title
  const fullTitle = site?.title && site.title !== title ? `${title} · ${site.title}` : title
  document.title = fullTitle

  const description = meta.description ?? fm.description ?? site?.description
  const canonical = meta.canonical ?? absoluteUrl(pagePath, site)
  const ogTitle = og.title ?? title
  const ogDescription = og.description ?? description
  const ogImage = absoluteUrl(og.image ?? site?.ogImage, site)
  const ogType = og.type ?? 'article'
  const ogUrl = og.url ?? canonical
  const ogSite = og.siteName ?? site?.title
  const ogLocale = og.locale ?? site?.locale
  const twCard = tw.card ?? (ogImage ? 'summary_large_image' : 'summary')
  const twSite = tw.site ?? site?.twitterSite
  const twTitle = tw.title ?? ogTitle
  const twDescription = tw.description ?? ogDescription
  const twImage = absoluteUrl(tw.image ?? og.image ?? site?.ogImage, site)

  if (description) upsert('meta[name="description"]', () => tag('meta', { name: 'description', content: description }))
  if (meta.keywords) {
    const v = Array.isArray(meta.keywords) ? meta.keywords.join(', ') : meta.keywords
    upsert('meta[name="keywords"]', () => tag('meta', { name: 'keywords', content: v }))
  }
  if (meta.author) upsert('meta[name="author"]', () => tag('meta', { name: 'author', content: meta.author }))
  if (meta.robots) upsert('meta[name="robots"]', () => tag('meta', { name: 'robots', content: meta.robots }))
  if (meta.themeColor) upsert('meta[name="theme-color"]', () => tag('meta', { name: 'theme-color', content: meta.themeColor }))
  if (canonical) upsert('link[rel="canonical"]', () => tag('link', { rel: 'canonical', href: canonical }))

  upsert('meta[property="og:title"]', () => tag('meta', { property: 'og:title', content: ogTitle }))
  if (ogDescription) upsert('meta[property="og:description"]', () => tag('meta', { property: 'og:description', content: ogDescription }))
  upsert('meta[property="og:type"]', () => tag('meta', { property: 'og:type', content: ogType }))
  if (ogUrl) upsert('meta[property="og:url"]', () => tag('meta', { property: 'og:url', content: ogUrl }))
  if (ogImage) upsert('meta[property="og:image"]', () => tag('meta', { property: 'og:image', content: ogImage }))
  if (og.imageAlt) upsert('meta[property="og:image:alt"]', () => tag('meta', { property: 'og:image:alt', content: og.imageAlt }))
  if (ogSite) upsert('meta[property="og:site_name"]', () => tag('meta', { property: 'og:site_name', content: ogSite }))
  if (ogLocale) upsert('meta[property="og:locale"]', () => tag('meta', { property: 'og:locale', content: ogLocale }))

  upsert('meta[name="twitter:card"]', () => tag('meta', { name: 'twitter:card', content: twCard }))
  if (twSite) upsert('meta[name="twitter:site"]', () => tag('meta', { name: 'twitter:site', content: twSite }))
  if (tw.creator) upsert('meta[name="twitter:creator"]', () => tag('meta', { name: 'twitter:creator', content: tw.creator }))
  upsert('meta[name="twitter:title"]', () => tag('meta', { name: 'twitter:title', content: twTitle }))
  if (twDescription) upsert('meta[name="twitter:description"]', () => tag('meta', { name: 'twitter:description', content: twDescription }))
  if (twImage) upsert('meta[name="twitter:image"]', () => tag('meta', { name: 'twitter:image', content: twImage }))
  if (tw.imageAlt) upsert('meta[name="twitter:image:alt"]', () => tag('meta', { name: 'twitter:image:alt', content: tw.imageAlt }))

  if (meta.jsonLd) {
    const json = typeof meta.jsonLd === 'string' ? meta.jsonLd : JSON.stringify(meta.jsonLd)
    const script = tag('script', { type: 'application/ld+json' }, json)
    script.setAttribute(MANAGED, 'page')
    document.head.appendChild(script)
  }
}
