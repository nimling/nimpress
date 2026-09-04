import type { FeedbackContext, FeedbackFunctions, NimpressFeedbackConfig, Viewer } from '../types'

let config: NimpressFeedbackConfig | null = null

export function configureFeedback(next: NimpressFeedbackConfig | undefined): void {
  config = next && (next.functions?.feedback || next.endpoint) ? next : null
}

export function feedbackConfigured(): boolean {
  return Boolean(config)
}

function functions(): FeedbackFunctions {
  return config?.functions ?? {}
}

function context(viewer: Viewer): FeedbackContext {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config?.appSlug) headers['SAuth-App-Slug'] = config.appSlug
  return {
    endpoint: config?.endpoint ?? '',
    appSlug: config?.appSlug ?? '',
    headers,
    viewer
  }
}

export async function sendFeedback(viewer: Viewer, path: string, data: string, name: string): Promise<void> {
  if (!config) return
  const ctx = context(viewer)
  if (functions().feedback) {
    await functions().feedback!(ctx, path, data, name)
    return
  }
  const res = await fetch(ctx.endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: ctx.headers,
    body: JSON.stringify({ path, data, name })
  })
  if (!res.ok) throw new Error(`feedback request returned ${res.status}`)
}
