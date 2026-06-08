import { mount } from 'svelte'
import { configureEdge } from '@nimling/samna-auth-middleware'
import '../styles/tokens.css'
import '../styles/preflight.css'
import AppRoot from '../layout/AppRoot.svelte'
import { setConfig } from './configStore'
import { refreshViewer } from './stores/viewer'
import { applyInitialTheme } from './stores/theme'
import { setAccessChecker } from '../auth/guard'
import type { NimpressConfig } from '../types'

export interface NimpressAppInstance {
  mount: (target: HTMLElement) => void
}

export function createNimpressApp(options: NimpressConfig): NimpressAppInstance {
  return {
    mount(target: HTMLElement) {
      setConfig(options)
      setAccessChecker(options.accessChecker)
      if (options.authEndpoint && options.clientSlug) {
        configureEdge({
          endpoint: options.authEndpoint,
          clientSlug: options.clientSlug
        })
      }
      applyInitialTheme()
      void refreshViewer()
      mount(AppRoot, { target })
    }
  }
}
