import { writable } from 'svelte/store'
import type { NimpressConfig } from '../types'
import { joinBase, normalizeBase, stripBase } from '../config/base'

const empty: NimpressConfig = {
  title: 'Docs',
  contentRoot: 'docs'
}

let base = '/'

export const configStore = writable<NimpressConfig>(empty)

export function setConfig(c: NimpressConfig) {
  base = normalizeBase(c.base)
  configStore.set({ ...c, base })
}

export function siteBase(): string {
  return base
}

export function withBase(path: string): string {
  return joinBase(base, path)
}

export function withoutBase(path: string): string {
  return stripBase(base, path)
}
