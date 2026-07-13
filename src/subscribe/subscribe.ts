import type { SubscribeConfig, SubscribeContext, SubscribeFunctions, Viewer } from '../types'

let config: SubscribeConfig | null = null

export function configureSubscribe(next: SubscribeConfig | undefined): void {
  config = next && (next.functions?.subscribe || next.endpoint) ? next : null
}

export function subscribeConfigured(): boolean {
  return Boolean(config)
}

function functions(): SubscribeFunctions {
  return config?.functions ?? {}
}

function context(viewer: Viewer): SubscribeContext {
  const headers: Record<string, string> = { 'Content-Type': 'application/rss+xml' }
  if (config?.appSlug) headers['SAuth-App-Slug'] = config.appSlug
  return {
    endpoint: config?.endpoint ?? '',
    appSlug: config?.appSlug ?? '',
    headers,
    viewer
  }
}

export async function subscribeFeed(viewer: Viewer, feed: string): Promise<void> {
  if (!config) throw new Error('subscribe is not configured')
  const ctx = context(viewer)
  if (functions().subscribe) {
    await functions().subscribe!(ctx, feed)
    return
  }
  const res = await fetch(ctx.endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: ctx.headers,
    body: feed
  })
  if (!res.ok) throw new Error(`subscription request returned ${res.status}`)
}
