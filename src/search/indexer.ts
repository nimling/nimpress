import MiniSearch from 'minisearch'
import { viewerCanAccess } from '../auth/guard'
import type { SearchEntry, Viewer } from '../types'

let cached: MiniSearch<SearchEntry> | null = null
let cachedEntries: SearchEntry[] = []

export function buildIndex(entries: SearchEntry[]): MiniSearch<SearchEntry> {
  const ms = new MiniSearch<SearchEntry>({
    idField: 'slug',
    fields: ['title', 'description', 'body', 'headings', 'tags', 'path'],
    storeFields: ['slug', 'path', 'title', 'description', 'scope', 'claim', 'tags', 'body'],
    searchOptions: {
      boost: { title: 3, tags: 3, headings: 2 },
      fuzzy: 0.2,
      prefix: true
    },
    extractField: (doc, field) => {
      const value = (doc as unknown as Record<string, unknown>)[field]
      if (Array.isArray(value)) return value.join(' ')
      return value == null ? '' : String(value)
    }
  })
  ms.addAll(entries)
  cached = ms
  cachedEntries = entries
  return ms
}

function compact(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function subsequenceRatio(query: string, target: string): number {
  if (!query || !target || query.length > target.length) return 0
  let qi = 0
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) qi++
  }
  return qi === query.length ? query.length / target.length : 0
}

function nameScore(query: string, entry: SearchEntry): number {
  const names = [entry.title, entry.path.split('/').pop() ?? '', ...entry.tags]
  let best = 0
  for (const name of names) {
    const target = compact(name)
    if (!target) continue
    const score = target.includes(query) ? 2 + query.length / target.length : subsequenceRatio(query, target)
    if (score > best) best = score
  }
  return best
}

function nameResults(query: string, entries: SearchEntry[]) {
  const q = compact(query)
  if (q.length < 3) return []
  return entries
    .map((entry) => ({ entry, score: nameScore(q, entry) }))
    .filter((hit) => hit.score > 0)
    .map((hit) => ({
      ...hit.entry,
      id: hit.entry.slug,
      score: 500 * hit.score,
      match: {},
      terms: [] as string[],
      queryTerms: [] as string[]
    }))
}

function parsePathPrefixes(query: string): { prefixes: string[]; rest: string } {
  const tokens = query.split(/\s+/)
  const prefixes: string[] = []
  const rest: string[] = []
  for (const tok of tokens) {
    const m = tok.match(/^([a-z0-9._\-\/]+)\/$/i)
    if (m) prefixes.push(m[1].toLowerCase().replace(/^\/+|\/+$/g, ''))
    else if (tok) rest.push(tok)
  }
  return { prefixes, rest: rest.join(' ') }
}

function matchesPathPrefix(path: string, prefixes: string[]): boolean {
  if (!prefixes.length) return true
  const normalized = '/' + path.toLowerCase().replace(/^\/+|\/+$/g, '')
  return prefixes.some((p) => normalized === '/' + p || normalized.startsWith('/' + p + '/'))
}

export function searchIndex(
  query: string,
  viewer: Viewer,
  index?: MiniSearch<SearchEntry>
) {
  const ms = index ?? cached
  if (!ms || !query.trim()) return []
  const { prefixes, rest } = parsePathPrefixes(query)
  const effective = rest.trim() || (prefixes.length ? '*' : '')
  const raw = effective === '*'
    ? ms.search(MiniSearch.wildcard)
    : ms.search(effective)
  const merged = new Map<string, (typeof raw)[number]>()
  for (const r of [...raw, ...(effective === '*' ? [] : nameResults(effective, cachedEntries))]) {
    const key = String(r.slug)
    const existing = merged.get(key)
    if (!existing || r.score > existing.score) merged.set(key, r)
  }
  return [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .filter((r) => matchesPathPrefix(String(r.path ?? ''), prefixes))
    .filter((r) =>
      viewerCanAccess(
        { scope: r.scope as string | undefined, claim: r.claim as string | undefined },
        viewer
      )
    )
    .slice(0, 20)
}
