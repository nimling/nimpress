import { writable } from 'svelte/store'
import { authConfigured, resolveViewer, endSession } from '../../auth/session'
import { deleteGatedContent, loadGatedContent } from '../gated'
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
    if (authConfigured()) await loadGatedContent(v.authenticated).catch(() => {})
    viewerReady.set(true)
    return v
  } catch {
    viewer.set(empty)
    if (authConfigured()) await loadGatedContent(false).catch(() => {})
    viewerReady.set(true)
    return empty
  }
}

export async function clearViewer(): Promise<void> {
  try {
    await endSession()
  } catch {}
  viewerReady.set(false)
  viewer.set(empty)
  deleteGatedContent()
  if (authConfigured()) await loadGatedContent(false).catch(() => {})
  viewerReady.set(true)
}
