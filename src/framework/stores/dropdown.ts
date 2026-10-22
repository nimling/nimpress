import { writable } from 'svelte/store'
import type { SidebarNode } from '../../types'

const KEY = 'nimpress-dropdown'

function load(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export const dropdownSelection = writable<Record<string, string>>(load())

dropdownSelection.subscribe((selection) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(selection))
  } catch {}
})

export function selectDropdown(id: string, value: string | null) {
  dropdownSelection.update((s) => {
    const next = { ...s }
    if (value === null) delete next[id]
    else next[id] = value
    return next
  })
}

function fits(node: SidebarNode, selection: Record<string, string>): boolean {
  return Object.entries(selection).every(([id, value]) => !node.dropdown?.[id] || node.dropdown[id].includes(value))
}

export function filterSidebar(nodes: SidebarNode[], selection: Record<string, string>): SidebarNode[] {
  if (!Object.keys(selection).length) return nodes
  return nodes.flatMap((node) => {
    if (!fits(node, selection)) return []
    if (!node.items) return [node]
    const items = filterSidebar(node.items, selection)
    if (!items.length && !node.link) return []
    if (node.variants && items.length === 1) return [{ ...items[0], text: node.text, icon: node.icon ?? items[0].icon, style: node.style ?? items[0].style }]
    return [{ ...node, items: items.length ? items : undefined }]
  })
}
