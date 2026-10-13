import { afterEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

vi.mock('../src/layout/GatedPage.svelte', () => ({ default: {} }))

const shell = {
  slug: 'internal/roadmap',
  path: '/internal/roadmap',
  type: 'doc',
  frontmatter: { title: 'Roadmap', gate: 'staff' },
  bundle: 'staff'
}

function respond(url: string, denied?: string): Response {
  if (url.endsWith('/access.json')) {
    return new Response(JSON.stringify({ routes: { '/internal/roadmap': { gate: 'staff', bundle: 'staff', denied } } }))
  }
  if (url.endsWith('/_guarded/staff/manifest.json')) {
    return new Response(JSON.stringify({ shells: [shell], styles: {}, sidebar: [] }))
  }
  return new Response('', { status: 404 })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('refreshViewer', () => {
  it('merges the gated shells into the manifest before the viewer is ready', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => respond(String(input))))
    const { setConfig, configStore } = await import('../src/framework/configStore')
    const { configureAuth } = await import('../src/auth/session')
    const { refreshViewer, viewerReady } = await import('../src/framework/stores/viewer')
    setConfig({ title: 'Docs', contentRoot: 'docs', manifest: { pages: {}, byPath: {} } } as never)
    configureAuth({
      issuer: 'https://auth.example.test',
      clientId: 'docs',
      functions: { resolveViewer: async () => ({ id: 'u1' }) }
    } as never)

    let atReady: string | undefined
    const unsub = viewerReady.subscribe((ready) => {
      if (ready) atReady = get(configStore).manifest?.byPath?.['/internal/roadmap']
    })
    const pending = refreshViewer()
    expect(get(viewerReady)).toBe(false)
    const v = await pending
    unsub()

    expect(v.authenticated).toBe(true)
    expect(atReady).toBe('internal/roadmap')
    const config = get(configStore)
    expect(config.manifest?.pages['internal/roadmap']?.gate).toBe('staff')
    expect(config.pageLoader?.['internal/roadmap']).toBeTypeOf('function')
    const { gatedShell } = await import('../src/framework/gated')
    const GatedPage = (await import('../src/layout/GatedPage.svelte')).default
    expect(gatedShell('internal/roadmap')).toEqual(shell)
    expect(await config.pageLoader?.['internal/roadmap']?.()).toEqual({ default: GatedPage })
  })

  it('becomes ready without a resolver when no auth is configured', async () => {
    const fetch = vi.fn(async (input: string) => respond(String(input)))
    vi.stubGlobal('fetch', fetch)
    const { configureAuth } = await import('../src/auth/session')
    const { refreshViewer, viewerReady } = await import('../src/framework/stores/viewer')
    configureAuth(undefined)

    const v = await refreshViewer()

    expect(v.authenticated).toBe(false)
    expect(get(viewerReady)).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends a signed out viewer on a gated route to the configured gateDenied without fetching bundles', async () => {
    const fetch = vi.fn(async (input: string) => respond(String(input)))
    vi.stubGlobal('fetch', fetch)
    const { setConfig } = await import('../src/framework/configStore')
    const { configureAuth } = await import('../src/auth/session')
    const { refreshViewer } = await import('../src/framework/stores/viewer')
    const { getGatedRoutes } = await import('../src/framework/gated')
    const { pageGuard } = await import('../src/auth/guard')
    setConfig({ title: 'Docs', contentRoot: 'docs', manifest: { pages: {}, byPath: {} } } as never)
    configureAuth({
      issuer: 'https://auth.example.test',
      clientId: 'docs',
      gateDenied: '/pricing',
      functions: { resolveViewer: async () => null }
    } as never)

    const v = await refreshViewer()
    const route = getGatedRoutes()['/internal/roadmap']

    expect(v.authenticated).toBe(false)
    expect(route?.gate).toBe('staff')
    expect(await pageGuard({ gate: route?.gate, denied: route?.denied })()).toBe('/pricing')
    expect(fetch.mock.calls.map(([url]) => String(url)).some((url) => url.includes('/_guarded/'))).toBe(false)
  })

  it('lets a page gateDenied of 404 win over the configured redirect', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => respond(String(input), '404')))
    const { setConfig } = await import('../src/framework/configStore')
    const { configureAuth } = await import('../src/auth/session')
    const { refreshViewer } = await import('../src/framework/stores/viewer')
    const { getGatedRoutes } = await import('../src/framework/gated')
    const { getDeniedTarget, pageGuard } = await import('../src/auth/guard')
    setConfig({ title: 'Docs', contentRoot: 'docs', manifest: { pages: {}, byPath: {} } } as never)
    configureAuth({
      issuer: 'https://auth.example.test',
      clientId: 'docs',
      gateDenied: '/pricing',
      functions: { resolveViewer: async () => null }
    } as never)

    await refreshViewer()
    const route = getGatedRoutes()['/internal/roadmap']

    expect(getDeniedTarget({ gate: route?.gate, denied: route?.denied })).toBe('404')
    expect(await pageGuard({ gate: route?.gate, denied: route?.denied })()).toBeNull()
  })
})
