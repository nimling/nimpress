import { get } from 'svelte/store'
import { handleUnauthenticated } from '@nimling/samna-auth-middleware'
import { viewer, viewerReady } from '../framework/stores/viewer'
import type { AccessChecker, AccessRequirement, Viewer } from '../types'

const defaultChecker: AccessChecker = (req, v) => {
  if (!req.scope && !req.claim) return true
  return v.authenticated
}

let registered: AccessChecker = defaultChecker

export function setAccessChecker(fn: AccessChecker | undefined): void {
  registered = fn ?? defaultChecker
}

export function viewerCanAccess(
  required: AccessRequirement | undefined,
  v: Viewer
): boolean {
  if (!required) return true
  return registered(required, v)
}

export function pageGuard(required: AccessRequirement) {
  return async () => {
    if (!get(viewerReady)) {
      await new Promise<void>((resolve) => {
        const unsub = viewerReady.subscribe((ready) => {
          if (ready) {
            unsub()
            resolve()
          }
        })
      })
    }
    if (viewerCanAccess(required, get(viewer))) return undefined
    const returnTo = window.location.pathname + window.location.search
    handleUnauthenticated(returnTo)
    return undefined
  }
}
