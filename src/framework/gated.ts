import { handleUnauthenticated } from '../auth/session'
import { configStore } from './configStore'
import GatedPage from '../layout/GatedPage.svelte'
import type { PageMeta, PageShell, SearchEntry, SidebarNode } from '../types'

interface GatedManifest {
  shells: PageShell[]
  styles: Record<string, string>
  sidebar: SidebarNode[]
}

interface GuardedRoute {
  gate?: string
  bundle: string
}

let loaded = false
let gatedBase = '/_guarded'

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

export async function loadGatedContent(): Promise<void> {
  if (loaded) return
  let routes: Record<string, GuardedRoute> = {}
  try {
    const accessRes = await fetch('/access.json')
    if (accessRes.ok) {
      const access = (await accessRes.json()) as { base?: string; routes?: Record<string, GuardedRoute> }
      if (access.base) gatedBase = access.base.replace(/\/$/, '')
      routes = access.routes ?? {}
    }
  } catch {}
  const bundles = [...new Set(Object.values(routes).map((r) => r.bundle))]
  if (!bundles.length) return
  const shells: PageShell[] = []
  let styles: Record<string, string> = {}
  let sidebar: SidebarNode[] | null = null
  let search: SearchEntry[] = []
  for (const bundle of bundles) {
    let res: Response
    try {
      res = await fetch(`${gatedBase}/${bundle}/manifest.json`, { credentials: 'include' })
    } catch {
      continue
    }
    if (!res.ok) continue
    const gated = (await res.json()) as GatedManifest
    shells.push(...gated.shells)
    styles = { ...styles, ...gated.styles }
    sidebar = gated.sidebar
    try {
      const searchRes = await fetch(`${gatedBase}/${bundle}/search.json`, { credentials: 'include' })
      if (searchRes.ok) search = [...search, ...((await searchRes.json()) as SearchEntry[])]
    } catch {}
  }
  if (!shells.length) return
  loaded = true

  configStore.update((config) => {
    const manifest = config.manifest
    if (!manifest) return config
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
        redirect: shell.frontmatter.redirect,
        meta: shell.frontmatter.meta
      }
      byPath[shell.path] = shell.slug
      pageLoader[shell.slug] = () => Promise.resolve({ default: GatedPage, props: { shell } })
    }
    return {
      ...config,
      manifest: { ...manifest, pages, byPath, styles: mergedStyles, sidebar: sidebar ?? manifest.sidebar },
      pageLoader,
      searchIndex: [...(config.searchIndex ?? []), ...search]
    }
  })
}
