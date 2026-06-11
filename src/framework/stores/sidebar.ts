import { writable } from 'svelte/store'

const KEY = 'nimpress-sidebar'

function load(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export const sidebarState = writable<Record<string, boolean>>(load())

sidebarState.subscribe((state) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
})

export function toggleGroup(key: string, currentlyOpen: boolean) {
  sidebarState.update((s) => ({ ...s, [key]: currentlyOpen }))
}

export function setGroupOpen(key: string, open: boolean) {
  sidebarState.update((s) => ({ ...s, [key]: open }))
}
