import { writable } from 'svelte/store'
import type { NimpressConfig } from '../types'

const empty: NimpressConfig = {
  title: 'Docs',
  contentRoot: 'docs'
}

export const configStore = writable<NimpressConfig>(empty)

export function setConfig(c: NimpressConfig) {
  configStore.set(c)
}
