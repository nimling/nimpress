<script lang="ts">
  import Header from './Header.svelte'
  import Sidebar from './Sidebar.svelte'
  import SearchModal from '../search/SearchModal.svelte'
  import { resolvedRoute } from 'sly-svelte-location-router'
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()

  let searchOpen = $state(false)
  let drawerOpen = $state(false)
  let collapsed = $state(loadCollapsed())

  function loadCollapsed(): boolean {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem('np-sidebar-collapsed') === 'true'
  }

  function persistCollapsed(value: boolean) {
    try {
      localStorage.setItem('np-sidebar-collapsed', String(value))
    } catch {}
  }

  function toggleSidebar() {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches
    if (isMobile) {
      drawerOpen = !drawerOpen
      return
    }
    collapsed = !collapsed
    persistCollapsed(collapsed)
  }

  function onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      searchOpen = true
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      toggleSidebar()
    }
    if (e.key === 'Escape') {
      searchOpen = false
      drawerOpen = false
    }
  }

  $effect(() => {
    $resolvedRoute
    drawerOpen = false
  })
</script>

<svelte:window onkeydown={onKey} />

<div class="np-app" class:np-drawer-open={drawerOpen} class:np-collapsed={collapsed}>
  <Header
    onOpenSearch={() => (searchOpen = true)}
    onToggleDrawer={toggleSidebar}
    drawerOpen={drawerOpen || !collapsed}
  />
  <div class="np-body">
    <aside class="np-aside" class:open={drawerOpen}>
      <Sidebar {collapsed} />
    </aside>
    {#if drawerOpen}
      <button
        class="np-drawer-backdrop"
        aria-label="Close menu"
        onclick={() => (drawerOpen = false)}
      ></button>
    {/if}
    <main class="np-main">
      {@render children()}
    </main>
    <div class="np-aside-mirror" aria-hidden="true"></div>
  </div>
  {#if searchOpen}
    <SearchModal onClose={() => (searchOpen = false)} />
  {/if}
</div>

<style>
  .np-app {
    position: relative;
    min-height: 100vh;
    background-color: var(--np-bg);
    color: var(--np-text-primary);
    overflow-x: clip;
    --np-sidebar-current: var(--np-sidebar-width);
  }
  .np-app.np-collapsed {
    --np-sidebar-current: 0px;
  }
  .np-body {
    position: relative;
    display: grid;
    grid-template-columns: var(--np-sidebar-current) minmax(0, 1fr);
    align-items: start;
    transition: grid-template-columns 0.32s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: grid-template-columns;
  }
  .np-aside-mirror {
    height: 0;
    pointer-events: none;
    display: none;
  }
  @media (min-width: 1280px) {
    .np-body {
      grid-template-columns: var(--np-sidebar-current) minmax(0, 1fr) var(--np-sidebar-current);
    }
    .np-aside-mirror {
      display: block;
    }
  }
  .np-aside {
    position: sticky;
    top: var(--np-header-height);
    height: calc(100vh - var(--np-header-height));
    overflow: hidden;
    background-color: transparent;
    z-index: 30;
  }
  .np-aside :global(.np-sidebar) {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: var(--np-sidebar-width);
    overflow-y: auto;
    background: none;
    background-color: transparent;
    border: 0;
    border-right: 1px solid var(--np-border);
    box-sizing: border-box;
  }
  .np-main {
    min-height: calc(100vh - var(--np-header-height));
    padding: 32px;
    min-width: 0;
  }
  .np-drawer-backdrop {
    display: none;
  }
  @media (max-width: 1024px) {
    .np-body {
      display: block;
    }
    .np-collapsed .np-body {
      display: block;
      grid-template-columns: none;
    }
    .np-main {
      width: 100%;
      box-sizing: border-box;
      padding: 32px;
    }
    .np-aside {
      position: fixed;
      top: var(--np-header-height);
      left: 0;
      bottom: 0;
      width: min(260px, 80vw);
      height: calc(100vh - var(--np-header-height));
      z-index: 40;
      transform: translateX(-100%);
      transition: transform 0.22s ease;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
      background-color: var(--np-bg);
    }
    .np-aside :global(.np-sidebar) {
      width: 100%;
      background-color: var(--np-bg);
    }
    .np-aside.open {
      transform: translateX(0);
    }
    .np-drawer-backdrop {
      display: block;
      position: fixed;
      top: var(--np-header-height);
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.35);
      z-index: 35;
      border: 0;
      padding: 0;
      cursor: pointer;
    }
  }
</style>
