<script lang="ts">
  import { get } from 'svelte/store'
  import { Router } from 'sly-svelte-location-router'
  import type { Routes } from 'sly-svelte-location-router'
  import App from './App.svelte'
  import HomePage from './HomePage.svelte'
  import { configStore } from '../framework/configStore'
  import { pageGuard } from '../auth/guard'

  function buildRoutes(): Routes {
    const config = get(configStore)
    const pages = config.manifest?.pages ?? {}
    const loaders = config.pageLoader ?? {}
    const routes: Routes = {}

    for (const [slug, meta] of Object.entries(pages)) {
      if (meta.redirect) {
        routes[meta.path] = meta.redirect
        continue
      }
      const loader = loaders[slug]
      if (!loader) continue
      routes[meta.path] = {
        name: slug || 'index',
        component: loader as () => Promise<{ default: unknown }>,
        guard: meta.scope || meta.claim
          ? pageGuard({ scope: meta.scope, claim: meta.claim })
          : undefined
      }
    }

    for (const [path, slug] of Object.entries(config.manifest?.byPath ?? {})) {
      if (routes[path]) continue
      const meta = pages[slug]
      const loader = loaders[slug]
      if (!meta || meta.redirect || !loader) continue
      routes[path] = {
        name: slug || 'index',
        component: loader as () => Promise<{ default: unknown }>,
        guard: meta.scope || meta.claim
          ? pageGuard({ scope: meta.scope, claim: meta.claim })
          : undefined
      }
    }

    if (!routes['/']) {
      routes['/'] = {
        name: 'home',
        component: () => Promise.resolve({ default: HomePage })
      }
    }

    return routes
  }

  const routes = buildRoutes()
</script>

<App>
  <Router {routes} fallback="/">
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
