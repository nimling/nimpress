import { mount } from 'svelte'
import { configureAuth } from '../auth/session'
import { configureSubscribe } from '../subscribe/subscribe'
import '../styles/tokens.css'
import '../styles/preflight.css'
import AppRoot from '../layout/AppRoot.svelte'
import { setConfig } from './configStore'
import { refreshViewer } from './stores/viewer'
import { applyInitialTheme } from './stores/theme'
import { setAccessChecker } from '../auth/guard'
import type { AuthFunctions, FeedbackFunctions, NimpressBrandConfig, NimpressConfig, SubscribeFunctions } from '../types'
import { configureFeedback } from '../feedback/feedback'

export interface NimpressAppInstance {
  mount: (target: HTMLElement) => void
}

export type NimpressAppOptions = NimpressConfig & {
  authFunctions?: AuthFunctions
  subscribeFunctions?: SubscribeFunctions
  feedbackFunctions?: FeedbackFunctions
}

function applyBrand(brand: NimpressBrandConfig | undefined): void {
  if (!brand) return
  const root = document.documentElement
  if (brand.primary) {
    root.style.setProperty('--np-brand', brand.primary)
    root.style.setProperty('--np-link', brand.primary)
    root.style.setProperty('--np-tip', brand.primary)
  }
  if (brand.primaryHover) root.style.setProperty('--np-brand-hover', brand.primaryHover)
}

export function createNimpressApp(options: NimpressAppOptions): NimpressAppInstance {
  const auth = options.auth
    ? { ...options.auth, functions: { ...(options.auth.functions ?? {}), ...(options.authFunctions ?? {}) } }
    : undefined
  const feedbackFunctions = { ...(options.feedback?.functions ?? {}), ...(options.feedbackFunctions ?? {}) }
  const feedback = options.feedback ? { ...options.feedback, functions: feedbackFunctions } : undefined
  const subscribeFunctions = { ...(options.subscribe?.functions ?? {}), ...(options.subscribeFunctions ?? {}) }
  const subscribe = options.subscribe || subscribeFunctions.subscribe
    ? { endpoint: '', appSlug: '', ...(options.subscribe ?? {}), functions: subscribeFunctions }
    : undefined
  return {
    mount(target: HTMLElement) {
      setConfig({ ...options, auth, subscribe, feedback })
      applyBrand(options.brand)
      configureAuth(auth)
      configureSubscribe(subscribe)
      configureFeedback(feedback)
      setAccessChecker(auth?.functions?.checkAccess ?? options.accessChecker)
      applyInitialTheme()
      void refreshViewer()
      mount(AppRoot, { target })
    }
  }
}
