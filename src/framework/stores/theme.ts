import { writable } from 'svelte/store'

type Mode = 'light' | 'dark'

const KEY = 'nimpress-theme'

function chosen(): Mode | null {
  try {
    const stored = window.localStorage.getItem(KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function system(): Mode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initial(): Mode {
  if (typeof window === 'undefined') return 'light'
  return chosen() ?? system()
}

export const theme = writable<Mode>(initial())

theme.subscribe((mode) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
})

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!chosen()) theme.set(system())
  })
}

export function toggleTheme() {
  theme.update((m) => {
    const next = m === 'dark' ? 'light' : 'dark'
    try {
      window.localStorage.setItem(KEY, next)
    } catch {}
    return next
  })
}

export function applyInitialTheme() {
  if (typeof document === 'undefined') return
  const mode = initial()
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

const SITE_KEY = 'nimpress-site-theme'

let siteThemeNames: string[] = ['stock']

export const siteTheme = writable<string>('stock')

export const siteThemes = writable<string[]>(siteThemeNames)

siteTheme.subscribe((name) => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.npTheme = name
})

export function applyInitialSiteTheme(fallback: string, names: string[]) {
  siteThemeNames = names
  siteThemes.set(names)
  let stored: string | null = null
  try {
    stored = window.localStorage.getItem(SITE_KEY)
  } catch {}
  siteTheme.set(stored && names.includes(stored) ? stored : fallback)
}

export function selectSiteTheme(name: string) {
  if (!siteThemeNames.includes(name)) return
  siteTheme.set(name)
  try {
    window.localStorage.setItem(SITE_KEY, name)
  } catch {}
}
