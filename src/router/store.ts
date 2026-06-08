import { writable } from 'svelte/store'
import type {
  ResolvedRouteStore,
  ErroneousRouteStore,
  CurrentRouteStore
} from './types'

const initialPath = typeof window === 'undefined' ? '/' : window.location.pathname
const initialSearch = typeof window === 'undefined' ? '' : window.location.search

export const resolvedRoute = writable<ResolvedRouteStore | null>({
  path: initialPath,
  segments: initialPath.split('/').filter(Boolean),
  search: initialSearch
})

export const erroneousRoute = writable<ErroneousRouteStore>(null)

export const currentRoute = writable<CurrentRouteStore>({
  path: initialPath,
  parentPath: initialPath,
  params: {}
})
