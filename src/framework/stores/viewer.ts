import { writable } from 'svelte/store'
import { resolveViewer, endSession } from '../../auth/session'
import { loadGatedContent } from '../gated'
import type { Viewer } from '../../types'

const empty: Viewer = {
  authenticated: false
}

export const viewer = writable<Viewer>(empty)
export const viewerReady = writable<boolean>(false)

export async function refreshViewer(): Promise<Viewer> {
  try {
    const v = await resolveViewer()
    viewer.set(v)
    if (v.authenticated) await loadGatedContent().catch(() => {})
    viewerReady.set(true)
    return v
  } catch {
    viewer.set(empty)
    viewerReady.set(true)
    return empty
  }
}

export async function clearViewer(): Promise<void> {
  try {
    await endSession()
  } catch {}
  viewer.set(empty)
}
