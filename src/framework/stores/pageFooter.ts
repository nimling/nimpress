import { writable } from 'svelte/store'

export interface PageFooter {
  path: string
  text: string | undefined
}

export const pageFooter = writable<PageFooter | null>(null)
