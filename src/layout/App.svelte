<script lang="ts">
  import { configStore } from '../framework/configStore'
  import { resolvedRoute, navigate, erroneousRoute } from 'sly-svelte-location-router'
  import { onMount } from 'svelte'
  import HomePage from './HomePage.svelte'
  import { viewerCanReach, waitForViewer, redirectToLogin } from '../framework/router'

  const config = $derived($configStore)
  const route = $derived($resolvedRoute)

  let PageComponent = $state<any>(null)
  let blockedPath = $state<string | null>(null)
  let loadToken = 0

  function resolveSlug(path: string): string | null {
    const cleaned = path === '/' || path === '' ? '/' : path.replace(/\/$/, '')
    const byPath = config.manifest?.byPath
    if (byPath && byPath[cleaned]) return byPath[cleaned]
    if (cleaned === '/') {
      if (config.manifest?.pages['']) return ''
      if (config.manifest?.pages['index']) return 'index'
      return null
    }
    const candidate = cleaned.replace(/^\//, '')
    if (config.manifest?.pages[candidate]) return candidate
    if (config.manifest?.pages[candidate + '/index']) return candidate + '/index'
    return null
  }

  function nearestParentPath(path: string): string | null {
    const byPath = config.manifest?.byPath
    if (!byPath) return null
    const segments = path.split('/').filter(Boolean)
    for (let i = segments.length - 1; i > 0; i--) {
      const candidate = '/' + segments.slice(0, i).join('/')
      if (byPath[candidate]) return candidate
    }
    return null
  }

  function handleUnresolved(path: string) {
    const parent = nearestParentPath(path)
    if (parent) {
      navigate(parent, { replace: true })
      return
    }
    erroneousRoute.set({ error: 'not_found', path })
  }

  async function load(path: string) {
    const token = ++loadToken
    PageComponent = null
    blockedPath = null
    erroneousRoute.set(null)

    const slug = resolveSlug(path)
    if (slug === null && (path === '/' || path === '')) return
    if (slug === null) {
      handleUnresolved(path)
      return
    }
    const meta = config.manifest?.pages[slug]
    if (!meta) {
      handleUnresolved(path)
      return
    }
    if (meta.redirect) {
      navigate(meta.redirect, { replace: true })
      return
    }

    await waitForViewer()
    if (token !== loadToken) return
    if (!viewerCanReach({ scope: meta.scope, claim: meta.claim })) {
      blockedPath = path
      redirectToLogin(path)
      return
    }

    const loader = config.pageLoader?.[slug]
    if (!loader) {
      handleUnresolved(path)
      return
    }
    const resolved = await loader() as { default: any }
    if (token !== loadToken) return
    PageComponent = resolved.default
  }

  $effect(() => {
    if (route?.path) void load(route.path)
  })

  onMount(() => {
    if (route?.path) void load(route.path)
  })
</script>

{#if PageComponent}
  <PageComponent />
{:else if blockedPath}
  <div class="np-block">
    <p>Sign-in required for {blockedPath}.</p>
  </div>
{:else if !route || route.path === '/' || route.path === ''}
  <HomePage />
{:else}
  <div class="np-loading"><span class="np-spinner"></span></div>
{/if}

<style>
  .np-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 64px 0;
  }
  .np-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--np-border);
    border-top-color: var(--np-brand);
    border-radius: 9999px;
    animation: np-spin 0.8s linear infinite;
  }
  @keyframes np-spin { to { transform: rotate(360deg); } }
  .np-block {
    padding: 64px 24px;
    text-align: center;
    color: var(--np-text-secondary);
  }
</style>
