import type { Component } from 'svelte'
import type { ThemeComponentName } from '../types'

const overrides = new Map<ThemeComponentName, Component<any>>()

export function setComponents(components: Partial<Record<ThemeComponentName, Component<any>>> | undefined): void {
  overrides.clear()
  for (const [name, component] of Object.entries(components ?? {})) {
    if (component) overrides.set(name as ThemeComponentName, component)
  }
}

export function themed<T extends Component<any>>(name: ThemeComponentName, stock: T): T {
  return (overrides.get(name) as T | undefined) ?? stock
}
