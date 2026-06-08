import { get } from 'svelte/store'
import { startLogin } from '@nimling/samna-auth-middleware'
import { viewer, viewerReady } from './stores/viewer'
import { viewerCanAccess } from '../auth/guard'
import type { AccessRequirement } from '../types'

export async function waitForViewer() {
  if (get(viewerReady)) return
  await new Promise<void>((resolve) => {
    const unsub = viewerReady.subscribe((ready) => {
      if (ready) {
        unsub()
        resolve()
      }
    })
  })
}

export function viewerCanReach(required: AccessRequirement): boolean {
  return viewerCanAccess(required, get(viewer))
}

export function redirectToLogin(returnTo: string) {
  startLogin(undefined, returnTo)
}
