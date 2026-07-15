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

export function useHarness(): HarnessContext {
  const ctx = getContext<HarnessContext>(HARNESS_KEY)
  if (!ctx) throw new Error('nimpress harness primitive used outside a ComponentHarness tree')
  return ctx
}
