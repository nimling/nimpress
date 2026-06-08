import type { Writable } from 'svelte/store'

export type RouteParams = { [key: string]: string }

export type RouteComponent = () => Promise<any>

export type RouteGuard = () => Promise<
  string | null | undefined | { path: string; state?: any }
>

export type RouteProps = any | (() => any)

export interface RouteData {
  name: string
  component: RouteComponent
  guard?: RouteGuard
  props?: RouteProps
}

export type RouteDataWithParent = RouteData & { parentRoute: string }

export type RoutesImpl = Record<string, RouteDataWithParent | string>

export type RouteDefinition = RouteData | RouteComponent | string

export type Routes = Record<string, RouteDefinition>

export interface MatchedRoute {
  params: RouteParams
  name: string
  component: () => Promise<any>
  guard?: RouteGuard
  props?: RouteProps
}

export interface RouterContext {
  resolveStore: Writable<ResolvedRouteStore | null>
  errorStore: Writable<ErroneousRouteStore>
  isRoot: boolean
  parentRoute?: string
}

export interface ResolvedRouteStore {
  path: string
  segments: string[]
  state?: any
  search?: string
}

export interface RouteComponentProps {
  params?: RouteParams
  error?: ErroneousRouteStore
  state?: any
  search?: { [key: string]: string }
}

export type ErroneousRouteStore =
  | { error: string; path: string }
  | null

export interface CurrentRouteStore {
  path: string
  params: RouteParams
  parentPath: string
}

export interface ResolvedRouteComponent {
  component: any | null
  props: { route: RouteComponentProps } | null
  name: string
  loading: boolean
  hasRemaining: boolean
}
