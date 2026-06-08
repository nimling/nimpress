import { writable } from 'svelte/store'

type Mode = 'light' | 'dark'

const KEY = 'nimpress-theme'

function initial(): Mode {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(KEY) as Mode | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const theme = writable<Mode>(initial())

theme.subscribe((mode) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
  try {
    window.localStorage.setItem(KEY, mode)
  } catch {}
})

export function toggleTheme() {
  theme.update((m) => (m === 'dark' ? 'light' : 'dark'))
}

export function applyInitialTheme() {
  if (typeof document === 'undefined') return
  const mode = initial()
  document.documentElement.classList.toggle('dark', mode === 'dark')
}
