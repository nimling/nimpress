import { match } from 'path-to-regexp'
import { derived, type Writable } from 'svelte/store'
import { resolvedRoute } from './store'
import type {
  MatchedRoute,
  ResolvedRouteComponent,
  ResolvedRouteStore,
  RouteComponent,
  RouteDefinition,
  RouteGuard,
  RouteParams,
  RouteProps,
  Routes,
  RoutesImpl
} from './types'

function setResolvedRoute(path: string, state?: any, search?: string) {
  resolvedRoute.set({
    path,
    segments: path.split('/').filter(Boolean),
    state,
    search: search ?? window.location.search
  })
}

function setUnresolvedStore(
  store: Writable<ResolvedRouteStore | null> | undefined,
  remaining: string[],
  state: any,
  search?: string
) {
  store?.set({
    path: remaining.length > 0 ? '/' + remaining.join('/') : '/',
    segments: remaining,
    state,
    search
  })
}

function createMatchedRoute(
  params: RouteParams,
  name: string,
  component: RouteComponent,
  guard: RouteGuard | undefined,
  props: RouteProps | undefined
): MatchedRoute {
  return { params, name, component, guard, props }
}

async function loadComponent(
  component: RouteComponent,
  params: RouteParams,
  state: any,
  name: string,
  hasRemaining: boolean,
  set: (v: ResolvedRouteComponent) => void,
  _cachedName: string | null,
  _cachedComponent: any,
  search: string | undefined,
  customProps: RouteProps | undefined
): Promise<{ name: string; component: any | null }> {
  try {
    const module = await component()
    const searchParams = !hasRemaining
      ? Object.fromEntries(new URLSearchParams(search || ''))
      : undefined
    const additionalProps = customProps
      ? typeof customProps === 'function'
        ? customProps()
        : customProps
      : null
    const finalProps = additionalProps
      ? { ...additionalProps, route: { params, state, search: searchParams } }
      : { route: { params, state, search: searchParams } }
    set({
      component: module.default,
      props: finalProps,
      name,
      loading: false,
      hasRemaining
    })
    return { name, component: module.default }
  } catch {
    set({
      component: null,
      props: null,
      name: '__error',
      loading: false,
      hasRemaining: false
    })
    return { name: '', component: null }
  }
}

export class Config {
  static routes: RoutesImpl | undefined
  static currentPath: string | undefined
  static isInitialized = false
}

function isValidRoutePattern(pattern: string): boolean {
  if (!pattern) return false
  if (pattern === '/') return true
  try {
    match(pattern, { decode: decodeURIComponent })
    return true
  } catch {
    return false
  }
}

function validateRoutes(routes: Routes) {
  for (const [pattern] of Object.entries(routes)) {
    if (!isValidRoutePattern(pattern)) {
      throw new Error(`Invalid route pattern: ${pattern}`)
    }
  }
}

function convertRoutesToRouteData(
  routes: Routes,
  parentRoute?: string
): RoutesImpl {
  const result: RoutesImpl = {}
  let expressionCounter = 1
  for (const [pattern, routeDefinition] of Object.entries(routes)) {
    if (typeof routeDefinition === 'string') {
      result[pattern] = routeDefinition
    } else {
      const segments = pattern.split('/').filter(Boolean)
      let routeName: string
      if (segments.length === 0) {
        routeName = 'index'
      } else {
        const firstSegment = segments[0]
        if (/^[a-zA-Z0-9_-]+$/.test(firstSegment)) {
          routeName = firstSegment
        } else {
          routeName = `expression${expressionCounter++}`
        }
      }
      if (typeof routeDefinition === 'function') {
        result[pattern] = {
          name: routeName,
          component: routeDefinition,
          parentRoute: parentRoute || ''
        }
      } else {
        result[pattern] = {
          ...routeDefinition,
          name: routeDefinition.name || routeName,
          parentRoute: parentRoute || ''
        }
      }
    }
  }
  return result
}

function appendToConfigRoutes(processedRoutes: RoutesImpl, parentRoute?: string) {
  if (!Config.routes) {
    Config.routes = processedRoutes
  } else {
    for (const [pattern, routeData] of Object.entries(processedRoutes)) {
      if (typeof routeData !== 'string' && parentRoute) {
        routeData.parentRoute = parentRoute
      }
      Config.routes[pattern] = routeData
    }
  }
}

export function resolveRoute(
  segments: string[],
  routes: RoutesImpl
): { matched: MatchedRoute | null; remaining: string[] } {
  if (segments.length === 0) {
    if (routes['/']) {
      const routeData = routes['/']
      if (typeof routeData === 'string') {
        const redirectSegments = routeData.split('/').filter(Boolean)
        return resolveRoute(redirectSegments, routes)
      } else if (typeof routeData === 'function') {
        return {
          matched: createMatchedRoute({}, '/', routeData as never, undefined, undefined),
          remaining: []
        }
      } else if ('name' in routeData && 'component' in routeData) {
        return {
          matched: createMatchedRoute({}, routeData.name, routeData.component, routeData.guard, routeData.props),
          remaining: []
        }
      }
    }
    return { matched: null, remaining: [] }
  }

  const sortedRouteKeys = Object.keys(routes)
    .filter(isValidRoutePattern)
    .sort((a, b) => {
      if (a.length !== b.length) return b.length - a.length
      const segmentsA = a.split('/').filter(Boolean)
      const segmentsB = b.split('/').filter(Boolean)
      if (segmentsA.length !== segmentsB.length) return segmentsB.length - segmentsA.length
      for (let i = 0; i < Math.min(segmentsA.length, segmentsB.length); i++) {
        const isParamA = segmentsA[i].startsWith(':')
        const isParamB = segmentsB[i].startsWith(':')
        if (isParamA !== isParamB) return isParamA ? 1 : -1
      }
      return 0
    })

  for (const routePath of sortedRouteKeys) {
    const routeSegments = routePath.split('/').filter(Boolean)
    if (routeSegments.length > segments.length) continue
    const testPath = routeSegments.length === 0 ? '/' : '/' + segments.slice(0, routeSegments.length).join('/')
    try {
      const matchFn = match(routePath, { decode: decodeURIComponent })
      const result = matchFn(testPath)
      if (result) {
        const routeData = routes[routePath]
        const remaining = segments.slice(routeSegments.length)
        if (typeof routeData === 'string') {
          const redirectSegments = routeData.split('/').filter(Boolean)
          return resolveRoute([...redirectSegments, ...remaining], routes)
        } else if (typeof routeData === 'function') {
          return {
            matched: createMatchedRoute(
              (result as { params: RouteParams }).params,
              routePath,
              routeData as never,
              undefined,
              undefined
            ),
            remaining
          }
        } else if ('name' in routeData && 'component' in routeData) {
          return {
            matched: createMatchedRoute(
              (result as { params: RouteParams }).params,
              routeData.name,
              routeData.component,
              routeData.guard,
              routeData.props
            ),
            remaining
          }
        }
      }
    } catch {
      continue
    }
  }
  return { matched: null, remaining: segments }
}

export function initRouter(parentRoute: string | undefined, routes: Routes) {
  if (typeof window === 'undefined') return
  validateRoutes(routes)
  const processedRoutes = convertRoutesToRouteData(routes, parentRoute)
  appendToConfigRoutes(processedRoutes, parentRoute)
  if (Config.isInitialized) return
  Config.isInitialized = true

  window.addEventListener('popstate', (event) => {
    setResolvedRoute(window.location.pathname, event.state, window.location.search)
    if (
      event.state &&
      typeof (event.state as any).scrollX === 'number' &&
      typeof (event.state as any).scrollY === 'number'
    ) {
      requestAnimationFrame(() =>
        window.scrollTo((event.state as any).scrollX, (event.state as any).scrollY)
      )
    }
  })

  document.body.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor || !anchor.href || !anchor.href.startsWith(window.location.origin)) return
    if (
      anchor.hasAttribute('download') ||
      anchor.hasAttribute('target') ||
      anchor.getAttribute('rel')?.includes('external') ||
      anchor.hasAttribute('data-no-routing')
    ) return
    const url = new URL(anchor.href)
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      if (!url.hash) return
      e.preventDefault()
      history.pushState(null, '', anchor.href)
      const id = decodeURIComponent(url.hash.slice(1))
      const target = id ? document.getElementById(id) : null
      if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' })
      return
    }
    e.preventDefault()
    history.replaceState(
      { ...history.state, scrollX: window.scrollX, scrollY: window.scrollY },
      ''
    )
    setResolvedRoute(url.pathname, null, url.search)
    history.pushState(null, '', anchor.href)
    requestAnimationFrame(() => window.scrollTo(0, 0))
  })
}

export function createRouteResolver(
  resolveStore: Writable<ResolvedRouteStore | null>,
  routes: Routes,
  unresolvedStore?: Writable<ResolvedRouteStore | null>
) {
  let cachedName: string | null = null
  let cachedComponent: any = null

  return derived<typeof resolveStore, ResolvedRouteComponent>(
    resolveStore,
    (store, set) => {
      if (!store) {
        set({ component: null, props: null, name: '', loading: false, hasRemaining: false })
        return
      }
      const impl = (Config.routes ?? convertRoutesToRouteData(routes)) as RoutesImpl
      const result = resolveRoute(store.segments, impl)
      if (result.matched) {
        const { component, params, name, guard, props: customProps } = result.matched
        const hasCachedComponent = cachedName === name && cachedComponent

        if (guard) {
          ;(async () => {
            try {
              const guardResult = await guard()
              if (guardResult) {
                cachedName = null
                cachedComponent = null
                if (typeof guardResult === 'string') {
                  history.replaceState(null, '', guardResult)
                  setResolvedRoute(guardResult)
                } else if (guardResult && typeof guardResult === 'object' && 'path' in guardResult) {
                  history.replaceState(guardResult.state || null, '', guardResult.path)
                  setResolvedRoute(guardResult.path, guardResult.state)
                }
                return
              }
              if (hasCachedComponent) {
                setUnresolvedStore(unresolvedStore, result.remaining, store.state, store.search)
                const additionalProps = customProps
                  ? typeof customProps === 'function'
                    ? customProps()
                    : customProps
                  : null
                const routePart = {
                  params,
                  state: store.state,
                  search: !result.remaining.length
                    ? Object.fromEntries(new URLSearchParams(store.search || ''))
                    : undefined
                }
                const finalProps = additionalProps
                  ? { ...additionalProps, route: routePart }
                  : { route: routePart }
                set({
                  component: cachedComponent,
                  props: finalProps,
                  name,
                  loading: false,
                  hasRemaining: result.remaining.length > 0
                })
              } else {
                set({ component: null, props: null, name: '', loading: true, hasRemaining: result.remaining.length > 0 })
                setUnresolvedStore(unresolvedStore, result.remaining, store.state, store.search)
                const loaded = await loadComponent(
                  component,
                  params,
                  store.state,
                  name,
                  result.remaining.length > 0,
                  set,
                  cachedName,
                  cachedComponent,
                  store.search,
                  customProps
                )
                cachedName = loaded.name
                cachedComponent = loaded.component
              }
            } catch {
              cachedName = null
              cachedComponent = null
              set({ component: null, props: null, name: '__error', loading: false, hasRemaining: false })
            }
          })()
        } else if (hasCachedComponent) {
          setUnresolvedStore(unresolvedStore, result.remaining, store.state, store.search)
          const additionalProps = customProps
            ? typeof customProps === 'function'
              ? customProps()
              : customProps
            : null
          const props = {
            route: {
              params,
              state: store.state,
              search: !result.remaining.length
                ? Object.fromEntries(new URLSearchParams(store.search || ''))
                : undefined
            }
          }
          const finalProps = additionalProps ? { ...additionalProps, ...props } : props
          set({
            component: cachedComponent,
            props: finalProps,
            name,
            loading: false,
            hasRemaining: result.remaining.length > 0
          })
        } else {
          set({ component: null, props: null, name: '', loading: true, hasRemaining: result.remaining.length > 0 })
          ;(async () => {
            setUnresolvedStore(unresolvedStore, result.remaining, store.state, store.search)
            const loaded = await loadComponent(
              component,
              params,
              store.state,
              name,
              result.remaining.length > 0,
              set,
              cachedName,
              cachedComponent,
              store.search,
              customProps
            )
            cachedName = loaded.name
            cachedComponent = loaded.component
          })()
        }
      } else {
        cachedName = null
        cachedComponent = null
        set({ component: null, props: null, name: '__not_found', loading: false, hasRemaining: false })
      }
    },
    { component: null, props: null, name: '', loading: true, hasRemaining: false } as ResolvedRouteComponent
  )
}

export function createErrorHandler(
  errorStore: Writable<{ error: string; path: string } | null>,
  fallback: RouteDefinition | undefined
) {
  return derived<typeof errorStore, ResolvedRouteComponent>(
    errorStore,
    (store, set) => {
      if (!store || !fallback) {
        set({ component: null, props: null, name: '', loading: false, hasRemaining: false })
        return
      }
      set({ component: null, props: null, name: '__fallback', loading: true, hasRemaining: false })
      if (typeof fallback === 'function') {
        fallback().then((module: any) => {
          set({
            component: module.default,
            props: { route: { error: store } },
            name: '__fallback',
            loading: false,
            hasRemaining: false
          })
        })
      } else if (typeof fallback === 'string') {
        set({ component: null, props: null, name: '__redirect', loading: true, hasRemaining: false })
        if (typeof window !== 'undefined' && window.location.pathname !== fallback) {
          history.replaceState(null, '', fallback)
          setResolvedRoute(fallback)
        }
        errorStore.set(null)
      } else if ('component' in fallback) {
        fallback.component().then((module: any) => {
          set({
            component: module.default,
            props: { route: { error: store } },
            name: '__fallback',
            loading: false,
            hasRemaining: false
          })
        })
      }
    },
    { component: null, props: null, name: '', loading: false, hasRemaining: false } as ResolvedRouteComponent
  )
}

export function navigate(path: string, state?: any) {
  history.replaceState(
    { ...history.state, scrollX: window.scrollX, scrollY: window.scrollY },
    ''
  )
  const url = new URL(path, window.location.origin)
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    history.pushState(state || null, '', path)
    if (url.hash) {
      const id = decodeURIComponent(url.hash.slice(1))
      const target = id ? document.getElementById(id) : null
      if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
    return
  }
  Config.currentPath = url.pathname
  setResolvedRoute(url.pathname, state, url.search)
  history.pushState(state || null, '', path)
  requestAnimationFrame(() => window.scrollTo(0, 0))
}
