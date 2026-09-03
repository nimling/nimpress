import { writable } from 'svelte/store'

const KEY = 'nimpress-tab'

function load(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export const linkedTab = writable<string>(load())

linkedTab.subscribe((id) => {
  if (typeof window === 'undefined' || !id) return
  try {
    window.localStorage.setItem(KEY, id)
  } catch {}
})

export function selectLinkedTab(id: string) {
  linkedTab.set(id)
}
