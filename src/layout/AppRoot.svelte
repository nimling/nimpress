<script lang="ts">
  import { get } from 'svelte/store'
  import { Router } from 'sly-svelte-location-router'
  import type { Routes } from 'sly-svelte-location-router'
  import App from './App.svelte'
  import HomePage from './HomePage.svelte'
  import { configStore, withBase } from '../framework/configStore'
  import { getDeniedTarget, pageGuard } from '../auth/guard'
  import { viewerReady } from '../framework/stores/viewer'
  import { gatedShell, getGatedRoutes } from '../framework/gated'
  import type { PageMeta } from '../types'

  function buildRoutes(): Routes {
    const config = get(configStore)
    const pages = config.manifest?.pages ?? {}
    const loaders = config.pageLoader ?? {}
    const gated = getGatedRoutes()
    const routes: Routes = {}

    function assign(path: string, value: Routes[string]): void {
      routes[path] = value
      if (path.length > 1 && path.endsWith('/')) routes[path.slice(0, -1)] = value
    }

    function redirectTo(name: string, target: string): Routes[string] {
      return {
        name,
        component: () => Promise.resolve({ default: HomePage }),
        guard: async () => withBase(target)
      }
    }

    function page(slug: string, meta: PageMeta, loader: unknown): Routes[string] {
      return {
        name: slug || 'index',
        component: loader as () => Promise<{ default: unknown }>,
        guard: meta.gate
          ? pageGuard({ gate: meta.gate, denied: gated[meta.path]?.denied })
          : undefined,
        props: gatedShell(slug) ? { shell: gatedShell(slug) } : undefined
      }
    }

    for (const [slug, meta] of Object.entries(pages)) {
      if (meta.redirect) {
        assign(withBase(meta.path), redirectTo(slug || 'index', meta.redirect))
        continue
      }
      const loader = loaders[slug]
      if (!loader) continue
      assign(withBase(meta.path), page(slug, meta, loader))
    }

    for (const [path, slug] of Object.entries(config.manifest?.byPath ?? {})) {
      if (routes[withBase(path)]) continue
      const meta = pages[slug]
      const loader = loaders[slug]
      if (!meta || meta.redirect || !loader) continue
      assign(withBase(path), page(slug, meta, loader))
    }

    for (const [path, route] of Object.entries(gated)) {
      if (routes[withBase(path)]) continue
      const target = getDeniedTarget({ gate: route.gate, denied: route.denied })
      if (target === '404') continue
      assign(withBase(path), redirectTo(path, target))
    }

    if (!routes[withBase('/')]) {
      assign(withBase('/'), {
        name: 'home',
        component: () => Promise.resolve({ default: HomePage })
      })
    }

    return routes
  }

  function buildFallback(): Routes[string] {
    const config = get(configStore)
    const notFound = Object.entries(config.manifest?.pages ?? {}).find(([, meta]) => meta.type === '404')
    const notFoundLoader = notFound ? config.pageLoader?.[notFound[0]] : undefined
    return (notFoundLoader ?? withBase('/')) as Routes[string]
  }
</script>

<App>
  {#if $viewerReady}
    {@const routes = buildRoutes()}
    {@const fallback = buildFallback()}
    <Router {routes} {fallback}>
      <div class="np-loading">
        <span class="np-spinner"></span>
      </div>
    </Router>
  {:else}
    <div class="np-loading">
      <span class="np-spinner"></span>
    </div>
  {/if}
</App>

<style>
  .np-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
  }
  .np-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--np-border);
    border-top-color: var(--np-brand);
    border-radius: 9999px;
    animation: np-spin 0.8s linear infinite;
  }
  @keyframes np-spin {
    to { transform: rotate(360deg); }
  }
</style>
