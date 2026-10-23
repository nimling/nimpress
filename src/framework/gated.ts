import { handleUnauthenticated } from '../auth/session'
import { configStore, withBase } from './configStore'
import GatedPage from '../layout/GatedPage.svelte'
import type { ManifestDropdown, PageMeta, PageShell, SearchEntry, SidebarNode } from '../types'

interface GatedManifest {
  shells: PageShell[]
  styles: Record<string, string>
  sidebar: SidebarNode[]
  dropdowns: ManifestDropdown[]
}

export interface GuardedRoute {
  gate?: string
  bundle: string
  denied?: string
}

interface PublishedAsset {
  path: string
  file: string
  bundle: string
  asset_id: string
  url: string
}

let loaded = false
let gatedBase = '/_guarded'
let published: PublishedAsset[] = []
let gatedRoutes: Record<string, GuardedRoute> = {}
let publicSidebar: SidebarNode[] | undefined
let publicDropdowns: ManifestDropdown[] | undefined
let gatedSearch: SearchEntry[] = []
const gatedShells = new Map<string, PageShell>()

// gatedFileUrl resolves a guarded file to the artifact it was published as. The
// publish step pairs the two, so a build with a pairing fetches by asset and one
// without it falls back to the bundle folder it was written to.
export function gatedFileUrl(bundle: string, file: string): string {
  const hit = published.find((a) => a.bundle === bundle && a.file.endsWith(file))
  if (hit) return hit.url || withBase(`${gatedBase}/${hit.asset_id}/data`)
  return withBase(`${gatedBase}/${bundle}/${file}`)
}

export function getGatedRoutes(): Record<string, GuardedRoute> {
  return gatedRoutes
}

export function gatedShell(slug: string): PageShell | undefined {
  return gatedShells.get(slug)
}

export function gatedContentBase(): string {
  return gatedBase
}

export async function gatedFetch(url: string): Promise<Response> {
  const res = await fetch(url, { credentials: 'include' })
  if (res.status === 401) {
    const returnTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined
    handleUnauthenticated(returnTo)
    throw new Error('gated fetch unauthorized')
  }
  return res
}

export async function loadGatedContent(authenticated: boolean): Promise<void> {
  if (loaded) return
  let routes: Record<string, GuardedRoute> = {}
  try {
    const accessRes = await fetch(withBase('/access.json'))
    if (accessRes.ok) {
      const access = (await accessRes.json()) as {
        base?: string
        prefix?: string
        routes?: Record<string, GuardedRoute>
        files?: PublishedAsset[]
      }
      if (access.prefix) gatedBase = access.prefix.replace(/\/$/, '')
      if (access.base) gatedBase = access.base.replace(/\/$/, '')
      routes = access.routes ?? {}
      gatedRoutes = routes
      published = access.files ?? []
    }
  } catch {}
  const bundles = [...new Set(Object.values(routes).map((r) => r.bundle))]
  if (!bundles.length) return
  const shells: PageShell[] = []
  let styles: Record<string, string> = {}
  let sidebar: SidebarNode[] | null = null
  let dropdowns: ManifestDropdown[] | null = null
  let search: SearchEntry[] = []
  for (const bundle of authenticated ? bundles : []) {
    let res: Response
    try {
      res = await fetch(gatedFileUrl(bundle, 'manifest.json'), { credentials: 'include' })
    } catch {
      continue
    }
    if (!res.ok) continue
    const gated = (await res.json()) as GatedManifest
    shells.push(...gated.shells)
    styles = { ...styles, ...gated.styles }
    sidebar = gated.sidebar
    dropdowns = gated.dropdowns
    try {
      const searchRes = await fetch(gatedFileUrl(bundle, 'search.json'), { credentials: 'include' })
      if (searchRes.ok) search = [...search, ...((await searchRes.json()) as SearchEntry[])]
    } catch {}
  }
  if (!shells.length) return
  loaded = true

  configStore.update((config) => {
    const manifest = config.manifest
    if (!manifest) return config
    publicSidebar = manifest.sidebar
    publicDropdowns = manifest.dropdowns
    gatedSearch = search
    const pages: Record<string, PageMeta> = { ...manifest.pages }
    const byPath: Record<string, string> = { ...manifest.byPath }
    const mergedStyles: Record<string, string> = { ...(manifest.styles ?? {}), ...styles }
    const pageLoader = { ...(config.pageLoader ?? {}) }
    for (const shell of shells) {
      pages[shell.slug] = {
        slug: shell.slug,
        path: shell.path,
        type: shell.type,
        title: shell.frontmatter.title,
        gate: shell.frontmatter.gate,
        bundle: shell.bundle,
        description: shell.frontmatter.description,
        order: shell.frontmatter.order,
        hidden: shell.frontmatter.visibility === 'dev-only',
        hide: shell.frontmatter.hide,
        redirect: shell.frontmatter.redirect,
        meta: shell.frontmatter.meta
      }
      byPath[shell.path] = shell.slug
      gatedShells.set(shell.slug, shell)
      pageLoader[shell.slug] = () => Promise.resolve({ default: GatedPage })
    }
    return {
      ...config,
      manifest: { ...manifest, pages, byPath, styles: mergedStyles, sidebar: sidebar ?? manifest.sidebar, dropdowns: dropdowns ?? manifest.dropdowns },
      pageLoader,
      searchIndex: [...(config.searchIndex ?? []), ...search]
    }
  })
}

export function deleteGatedContent(): void {
  if (!loaded) return
  const slugs = new Set(gatedShells.keys())
  configStore.update((config) => {
    const manifest = config.manifest
    if (!manifest) return config
    const pages: Record<string, PageMeta> = { ...manifest.pages }
    const byPath: Record<string, string> = { ...manifest.byPath }
    const pageLoader = { ...(config.pageLoader ?? {}) }
    for (const slug of slugs) {
      delete pages[slug]
      delete pageLoader[slug]
    }
    for (const [path, slug] of Object.entries(byPath)) {
      if (slugs.has(slug)) delete byPath[path]
    }
    return {
      ...config,
      manifest: { ...manifest, pages, byPath, sidebar: publicSidebar ?? manifest.sidebar, dropdowns: publicDropdowns ?? manifest.dropdowns },
      pageLoader,
      searchIndex: (config.searchIndex ?? []).filter((entry) => !gatedSearch.includes(entry))
    }
  })
  gatedShells.clear()
  gatedSearch = []
  loaded = false
}
