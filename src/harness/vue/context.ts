import {
  inject,
  ref,
  shallowRef,
  type Component,
  type InjectionKey,
  type Ref,
  type ShallowRef,
} from 'vue'

export interface HarnessContext {
  component: ShallowRef<Component | null>
  props: ShallowRef<Record<string, unknown>>
  slots: ShallowRef<Record<string, () => unknown>>
  overlay: ShallowRef<Component | null>
  shadow: Ref<boolean>
  zoom: Ref<number>
}

export const HARNESS_KEY: InjectionKey<HarnessContext> = Symbol('nimpressHarness')

export function createHarnessContext(): HarnessContext {
  return {
    component: shallowRef(null),
    props: shallowRef({}),
    slots: shallowRef({}),
    overlay: shallowRef(null),
    shadow: ref(false),
    zoom: ref(1),
  }
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
  const ctx = inject(HARNESS_KEY, null)
  if (!ctx) throw new Error('nimpress harness primitive used outside a ComponentHarness tree')
  return ctx
}
