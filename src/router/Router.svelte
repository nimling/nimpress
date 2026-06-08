<script lang="ts">
  import { onMount, getContext, setContext } from 'svelte'
  import { writable } from 'svelte/store'
  import { createRouteResolver, createErrorHandler, initRouter } from './router'
  import { resolvedRoute, erroneousRoute, currentRoute } from './store'
  import type {
    RouteDefinition,
    Routes,
    RouterContext,
    ResolvedRouteStore,
    ErroneousRouteStore
  } from './types'

  let {
    routes,
    fallback,
    children
  }: { routes: Routes; fallback: RouteDefinition; children: any } = $props()

  const ctx = getContext<RouterContext | undefined>('sly-router')
  const { resolveStore, errorStore, isRoot, parentRoute }: RouterContext = ctx || {
    resolveStore: resolvedRoute,
    errorStore: erroneousRoute,
    isRoot: true
  }

  const unresolvedRoute = writable<ResolvedRouteStore | null>(null)
  const routeError = writable<ErroneousRouteStore>(null)

  const resolvedComponent = createRouteResolver(resolveStore, routes, unresolvedRoute)
  const fallbackComponent = createErrorHandler(errorStore, fallback)

  const myMatchedPath = $derived.by(() => {
    if (!$resolveStore || !$unresolvedRoute) return parentRoute || ''
    const fullPath = $resolvedRoute!.path
    const remainingPath = $unresolvedRoute.path
    return fullPath.slice(0, fullPath.length - remainingPath.length) || '/'
  })

  setContext('sly-router', {
    resolveStore: unresolvedRoute,
    errorStore: routeError,
    isRoot: false,
    parentRoute: myMatchedPath
  })

  $effect(() => {
    if ($resolvedComponent.component && !$resolvedComponent.loading && !$resolvedComponent.hasRemaining) {
      currentRoute.set({
        path: $resolvedRoute!.path,
        params: ($resolvedComponent.props?.route as { params?: Record<string, string> })?.params || {},
        parentPath: parentRoute || ''
      })
    }
  })

  onMount(() => {
    if (isRoot) {
      initRouter(parentRoute, routes)
      resolvedRoute.set({
        path: window.location.pathname,
        segments: window.location.pathname.split('/').filter(Boolean),
        search: window.location.search
      })
    }
  })

  const activeProps = $derived($fallbackComponent.props || $resolvedComponent.props)
  const isCompLoading = $derived($resolvedComponent.loading || $fallbackComponent.loading)
  const routeKey = $derived.by(() => {
    const name = $fallbackComponent.name || $resolvedComponent.name || ''
    const search = $resolveStore?.search || ''
    return search ? `${name}-${search}` : name
  })

  let StableComp = $state<any>(null)
  let currentComponentConstructor = $state<any>(null)

  $effect(() => {
    const newComp = $fallbackComponent.component || $resolvedComponent.component
    if (newComp && newComp !== currentComponentConstructor) {
      currentComponentConstructor = newComp
      StableComp = newComp
    }
  })

  let debouncedLoading = $state(true)
  let showLoading = $state(true)
  let timeout: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    if (timeout) clearTimeout(timeout)

    if (isCompLoading && !StableComp) {
      showLoading = true
      debouncedLoading = true
      return
    }

    if (StableComp && !isCompLoading) {
      debouncedLoading = false
      showLoading = false
      return
    }

    timeout = setTimeout(() => {
      debouncedLoading = isCompLoading
      showLoading = isCompLoading
    }, 1000)
  })
</script>

{#if debouncedLoading}
  {#if showLoading && children}
    {@render children()}
  {:else if StableComp}
    <StableComp {...activeProps}></StableComp>
  {/if}
{:else if StableComp}
  {#key routeKey}
    <StableComp {...activeProps}></StableComp>
  {/key}
{/if}
