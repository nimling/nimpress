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

export function useHarness(): HarnessContext {
  const ctx = inject(HARNESS_KEY, null)
  if (!ctx) throw new Error('nimpress harness primitive used outside a ComponentHarness tree')
  return ctx
}
