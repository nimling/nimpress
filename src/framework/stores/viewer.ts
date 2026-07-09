import { writable } from 'svelte/store'
import {
  readSessionFromDocument,
  endSession
} from '@nimling/samna-auth-middleware'
import { loadGatedContent } from '../gated'
import type { Viewer } from '../../types'

const empty: Viewer = {
  authenticated: false
}

export const viewer = writable<Viewer>(empty)
export const viewerReady = writable<boolean>(false)

export async function refreshViewer(): Promise<Viewer> {
  try {
    const user = await readSessionFromDocument()
    if (!user) {
      viewer.set(empty)
      viewerReady.set(true)
      return empty
    }

    const v: Viewer = {
      authenticated: true,
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      phone: user.phone,
      email: user.email,
      location: user.location,
      type: user.type
    }
    viewer.set(v)
    viewerReady.set(true)
    void loadGatedContent()
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
