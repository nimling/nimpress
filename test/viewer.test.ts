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

function respond(url: string): Response {
  if (url.endsWith('/access.json')) {
    return new Response(JSON.stringify({ routes: { '/internal/roadmap': { gate: 'staff', bundle: 'staff' } } }))
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
})
