import { get } from 'svelte/store'
import { getGateDenied } from './session'
import { withBase } from '../framework/configStore'
import { viewer, viewerReady } from '../framework/stores/viewer'
import type { AccessChecker, AccessRequirement, Viewer } from '../types'

const defaultChecker: AccessChecker = (req, v) => {
  if (!req.gate) return true
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

export function getDeniedTarget(required: AccessRequirement): string {
  return required.denied ?? getGateDenied()
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
    if (viewerCanAccess(required, get(viewer))) return null
    const target = getDeniedTarget(required)
    return target === '404' ? null : withBase(target)
  }
}
