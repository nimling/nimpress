import MiniSearch from 'minisearch'
import { viewerCanAccess } from '../auth/guard'
import type { SearchEntry, Viewer } from '../types'

let cached: MiniSearch<SearchEntry> | null = null

export function buildIndex(entries: SearchEntry[]): MiniSearch<SearchEntry> {
  const ms = new MiniSearch<SearchEntry>({
    idField: 'slug',
    fields: ['title', 'description', 'body', 'headings'],
    storeFields: ['slug', 'path', 'title', 'description', 'scope', 'claim'],
    searchOptions: {
      boost: { title: 3, headings: 2 },
      fuzzy: 0.2,
      prefix: true
    }
  })
  ms.addAll(entries)
  cached = ms
  return ms
}

export function searchIndex(
  query: string,
  viewer: Viewer,
  index?: MiniSearch<SearchEntry>
) {
  const ms = index ?? cached
  if (!ms || !query.trim()) return []
  const results = ms.search(query)
  return results
    .filter((r) =>
      viewerCanAccess(
        { scope: r.scope as string | undefined, claim: r.claim as string | undefined },
        viewer
      )
    )
    .slice(0, 20)
}
