<script lang="ts">
  import { get } from 'svelte/store'
  import { Router } from 'sly-svelte-location-router'
  import type { Routes } from 'sly-svelte-location-router'
  import App from './App.svelte'
  import HomePage from './HomePage.svelte'
  import { configStore, withBase } from '../framework/configStore'
  import { pageGuard } from '../auth/guard'

  function buildRoutes(): Routes {
    const config = get(configStore)
    const pages = config.manifest?.pages ?? {}
    const loaders = config.pageLoader ?? {}
    const routes: Routes = {}

    function assign(path: string, value: Routes[string]): void {
      routes[path] = value
      if (path.length > 1 && path.endsWith('/')) routes[path.slice(0, -1)] = value
    }

    for (const [slug, meta] of Object.entries(pages)) {
      if (meta.redirect) {
        assign(withBase(meta.path), withBase(meta.redirect))
        continue
      }
      const loader = loaders[slug]
      if (!loader) continue
      assign(withBase(meta.path), {
        name: slug || 'index',
        component: loader as () => Promise<{ default: unknown }>,
        guard: meta.gate
          ? pageGuard({ gate: meta.gate })
          : undefined
      })
    }

    for (const [path, slug] of Object.entries(config.manifest?.byPath ?? {})) {
      if (routes[withBase(path)]) continue
      const meta = pages[slug]
      const loader = loaders[slug]
      if (!meta || meta.redirect || !loader) continue
      assign(withBase(path), {
        name: slug || 'index',
        component: loader as () => Promise<{ default: unknown }>,
        guard: meta.gate
          ? pageGuard({ gate: meta.gate })
          : undefined
      })
    }

    if (!routes[withBase('/')]) {
      assign(withBase('/'), {
        name: 'home',
        component: () => Promise.resolve({ default: HomePage })
      })
    }

    return routes
  }

  const routes = buildRoutes()
  const fallback = withBase('/')
</script>

<App>
  <Router {routes} {fallback}>
    <div class="np-loading">
      <span class="np-spinner"></span>
    </div>
  </Router>
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
