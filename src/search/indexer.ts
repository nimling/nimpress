import MiniSearch from 'minisearch'
import { viewerCanAccess } from '../auth/guard'
import type { SearchEntry, Viewer } from '../types'

let cached: MiniSearch<SearchEntry> | null = null

export function buildIndex(entries: SearchEntry[]): MiniSearch<SearchEntry> {
  const ms = new MiniSearch<SearchEntry>({
    idField: 'slug',
    fields: ['title', 'description', 'body', 'headings', 'tags'],
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
  return ms
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
  return raw
    .filter((r) => matchesPathPrefix(String(r.path ?? ''), prefixes))
    .filter((r) =>
      viewerCanAccess(
        { scope: r.scope as string | undefined, claim: r.claim as string | undefined },
        viewer
      )
    )
    .slice(0, 20)
}
