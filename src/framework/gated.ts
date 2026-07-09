import { handleUnauthenticated } from '@nimling/samna-auth-middleware'
import { configStore } from './configStore'
import GatedPage from '../layout/GatedPage.svelte'
import type { PageMeta, PageShell, SearchEntry, SidebarNode } from '../types'

interface GatedManifest {
  shells: PageShell[]
  styles: Record<string, string>
  sidebar: SidebarNode[]
}

let loaded = false
let gatedBase = '/_gated'

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
  try {
    const accessRes = await fetch('/access.json')
    if (accessRes.ok) {
      const access = (await accessRes.json()) as { base?: string }
      if (access.base) gatedBase = access.base.replace(/\/$/, '')
    }
  } catch {}
  let res: Response
  try {
    res = await fetch(`${gatedBase}/manifest.json`, { credentials: 'include' })
  } catch {
    return
  }
  if (!res.ok) return
  loaded = true
  const gated = (await res.json()) as GatedManifest
  let search: SearchEntry[] = []
  try {
    const searchRes = await fetch(`${gatedBase}/search.json`, { credentials: 'include' })
    if (searchRes.ok) search = (await searchRes.json()) as SearchEntry[]
  } catch {}

  configStore.update((config) => {
    const manifest = config.manifest
    if (!manifest) return config
    const pages: Record<string, PageMeta> = { ...manifest.pages }
    const byPath: Record<string, string> = { ...manifest.byPath }
    const styles: Record<string, string> = { ...(manifest.styles ?? {}), ...gated.styles }
    const pageLoader = { ...(config.pageLoader ?? {}) }
    for (const shell of gated.shells) {
      pages[shell.slug] = {
        slug: shell.slug,
        path: shell.path,
        type: shell.type,
        title: shell.frontmatter.title,
        scope: shell.frontmatter.scope,
        claim: shell.frontmatter.claim,
        description: shell.frontmatter.description,
        order: shell.frontmatter.order,
        hidden: shell.frontmatter.hidden,
        redirect: shell.frontmatter.redirect,
        meta: shell.frontmatter.meta
      }
      byPath[shell.path] = shell.slug
      pageLoader[shell.slug] = () => Promise.resolve({ default: GatedPage, props: { shell } })
    }
    return {
      ...config,
      manifest: { ...manifest, pages, byPath, styles, sidebar: gated.sidebar },
      pageLoader,
      searchIndex: [...(config.searchIndex ?? []), ...search]
    }
  })
}
