import { mount } from 'svelte'
import { configureEdge } from '@nimling/samna-auth-middleware'
import '../styles/tokens.css'
import '../styles/preflight.css'
import AppRoot from '../layout/AppRoot.svelte'
import { setConfig } from './configStore'
import { refreshViewer } from './stores/viewer'
import { applyInitialTheme } from './stores/theme'
import { setAccessChecker } from '../auth/guard'
import type { NimpressBrandConfig, NimpressConfig } from '../types'

export interface NimpressAppInstance {
  mount: (target: HTMLElement) => void
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

export function createNimpressApp(options: NimpressConfig): NimpressAppInstance {
  return {
    mount(target: HTMLElement) {
      setConfig(options)
      applyBrand(options.brand)
      setAccessChecker(options.accessChecker)
      if (options.authMode === 'bff' || (options.authEndpoint && options.clientSlug)) {
        configureEdge({
          endpoint: options.authEndpoint ?? '',
          clientSlug: options.clientSlug ?? '',
          mode: options.authMode,
          bffPath: options.bffPath,
          callbacks: options.authCallbacks
        })
      }
      applyInitialTheme()
      void refreshViewer()
      mount(AppRoot, { target })
    }
  }
}
