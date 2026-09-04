import { relative, sep, resolve } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import matter from 'gray-matter'
import type { ResolvedNimpressConfig } from '../types'
import { flag, walkFiles } from './shared'
import { seoGenerate, seoRobotsValue, type SeoSource } from '../plugin'

interface SeoRecord {
  path: string
  file: string
  title: string
  keywords: string[]
  description: string
  robots: string
  canonical: string
  generated: { keywords: string[]; description: string }
  authored: { keywords?: string[]; description?: string; override: boolean; ai?: boolean }
}

function routeOf(root: string, file: string, data: Record<string, unknown>): string {
  if (typeof data.path === 'string') return data.path.startsWith('/') ? data.path : `/${data.path}`
  const rel = relative(root, file).split(sep).join('/').replace(/\.md$/, '')
  const route = rel === 'index' ? '/' : `/${rel.replace(/\/index$/, '')}`
  return route
}

function tagsOf(raw: unknown): string[] {
  if (!raw) return []
  const parts = Array.isArray(raw) ? raw : String(raw).split(',')
  return parts.map((part) => String(part).trim()).filter(Boolean)
}

function headingsOf(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, '').trim())
}

export function collectSeo(cwd: string, resolved: ResolvedNimpressConfig): SeoRecord[] {
  const root = resolve(cwd, resolved.contentDir)
  const files = walkFiles(root).filter((file) => file.endsWith('.md'))
  const pages = files
    .map((file) => {
      const { data, content } = matter(readFileSync(file, 'utf-8'))
      return { file, data: data as Record<string, unknown>, content }
    })
    .filter((page) => typeof page.data.title === 'string' && page.data.visibility !== 'hidden' && !page.data.link)
  const sources: SeoSource[] = pages.map((page) => ({
    slug: page.file,
    title: String(page.data.title),
    headings: headingsOf(page.content),
    tags: tagsOf(page.data.tags),
    body: page.content
  }))
  const generated = seoGenerate(sources)
  const siteUrl = resolved.site?.url?.replace(/\/$/, '') ?? ''
  const base = resolved.base.replace(/\/$/, '')
  return pages.map((page) => {
    const auto = generated.get(page.file) ?? { keywords: [], description: '' }
    const meta = (page.data.meta ?? {}) as Record<string, unknown>
    const authoredKeywords = Array.isArray(meta.keywords) ? (meta.keywords as string[]) : typeof meta.keywords === 'string' ? [meta.keywords] : undefined
    const authoredDescription = typeof meta.description === 'string' ? meta.description : typeof page.data.description === 'string' ? page.data.description : undefined
    const override = meta.override === true
    const autoOn = resolved.seo?.auto === true
    const keywords = autoOn ? (override && authoredKeywords ? authoredKeywords : auto.keywords.length ? auto.keywords : authoredKeywords ?? []) : authoredKeywords ?? tagsOf(page.data.tags)
    const description = autoOn ? (override && authoredDescription ? authoredDescription : auto.description || authoredDescription || '') : authoredDescription ?? ''
    const route = routeOf(root, page.file, page.data)
    return {
      path: route,
      file: relative(cwd, page.file).split(sep).join('/'),
      title: String(page.data.title),
      keywords,
      description,
      robots: seoRobotsValue(typeof meta.robots === 'string' ? meta.robots : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1', resolved.seo?.ai?.index, typeof meta.ai === 'boolean' ? meta.ai : undefined),
      canonical: typeof meta.canonical === 'string' ? meta.canonical : siteUrl ? `${siteUrl}${base}${route === '/' ? '/' : route}` : '',
      generated: auto,
      authored: { keywords: authoredKeywords, description: authoredDescription, override, ai: typeof meta.ai === 'boolean' ? meta.ai : undefined }
    }
  })
}

export function writeSeo(cwd: string, records: SeoRecord[]): number {
  let written = 0
  for (const record of records) {
    const file = resolve(cwd, record.file)
    const { data, content } = matter(readFileSync(file, 'utf-8'))
    const meta = { ...((data.meta as Record<string, unknown>) ?? {}) }
    let changed = false
    if (meta.keywords === undefined && record.generated.keywords.length) {
      meta.keywords = record.generated.keywords
      changed = true
    }
    if (meta.description === undefined && record.generated.description) {
      meta.description = record.generated.description
      changed = true
    }
    if (!changed) continue
    writeFileSync(file, matter.stringify(content, { ...data, meta }))
    written += 1
  }
  return written
}

export function runSeo(cwd: string, resolved: ResolvedNimpressConfig, args: string[]): void {
  const records = collectSeo(cwd, resolved)
  const out = flag(args, 'out') ?? 'seo.map.json'
  for (const record of records) {
    const source = resolved.seo?.auto ? (record.authored.override ? 'authored' : 'generated') : 'authored'
    console.log(`${record.path.padEnd(40)} ${String(record.keywords.length).padStart(2)} keywords  ${String(record.description.length).padStart(3)} chars  ${record.robots.includes('noai') ? 'noai' : 'ai ok'}  ${source}`)
  }
  writeFileSync(resolve(cwd, out), JSON.stringify(records, null, 2) + '\n')
  console.log(`nimpress seo: ${records.length} pages, map written to ${out}`)
  if (args.includes('--write')) {
    const written = writeSeo(cwd, records)
    console.log(`nimpress seo: generated fields written into ${written} pages`)
  }



}
