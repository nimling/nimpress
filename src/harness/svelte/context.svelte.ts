import { getContext, setContext } from 'svelte'
import type { Component } from 'svelte'

export interface HarnessContext {
  component: Component | null
  props: Record<string, unknown>
  overlay: Component | null
  shadow: boolean
  zoom: number
}

const HARNESS_KEY = Symbol('nimpressHarness')

export function createHarnessContext(): HarnessContext {
  return $state({ component: null, props: {}, overlay: null, shadow: false, zoom: 1 })
}

export function setHarness(ctx: HarnessContext): void {
  setContext(HARNESS_KEY, ctx)
}

export interface HarnessStageBounds {
  minWidth?: number | string
  maxWidth?: number | string
}

export function setStage(bounds: HarnessStageBounds | null): void {
  const el = document.getElementById('stage')
  if (!el) return
  const dim = (v: number | string | undefined): string => (v === undefined ? '' : typeof v === 'number' ? `${v}px` : v)
  if (!bounds || (bounds.minWidth === undefined && bounds.maxWidth === undefined)) {
    for (const prop of ['display', 'margin', 'width', 'min-width', 'max-width']) el.style.removeProperty(prop)
    return
  }
  el.style.display = 'block'
  el.style.margin = '0 auto'
  el.style.width = '100%'
  el.style.minWidth = dim(bounds.minWidth)
  el.style.maxWidth = dim(bounds.maxWidth)
}

export function useHarness(): HarnessContext {
  const ctx = getContext<HarnessContext>(HARNESS_KEY)
  if (!ctx) throw new Error('nimpress harness primitive used outside a ComponentHarness tree')
  return ctx
}
