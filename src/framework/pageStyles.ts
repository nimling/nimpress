import { get } from 'svelte/store'
import { configStore } from './configStore'

const ATTR = 'data-np-page-style'

function activePaths(current: string, styles: Record<string, string>): string[] {
  return Object.keys(styles).filter(
    (path) => current === path || current.startsWith(path === '/' ? '/' : path + '/')
  )
}

export function applyPageStyles(current: string): void {
  if (typeof document === 'undefined') return
  const styles = get(configStore).manifest?.styles ?? {}
  const wanted = new Set(activePaths(current, styles))

  for (const el of Array.from(document.querySelectorAll(`style[${ATTR}]`))) {
    if (!wanted.has(el.getAttribute(ATTR) ?? '')) el.remove()
  }

  for (const path of wanted) {
    const existing = document.querySelector(`style[${ATTR}="${path}"]`)
    if (existing) continue
    const el = document.createElement('style')
    el.setAttribute(ATTR, path)
    el.textContent = styles[path]
    document.head.appendChild(el)
  }
}
