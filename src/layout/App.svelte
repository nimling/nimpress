<script lang="ts">
  import StockHeader from './Header.svelte'
  import StockAnnounce from './Announce.svelte'
  import StockFooter from './Footer.svelte'
  import StockSidebar from './Sidebar.svelte'
  import StockSearchModal from '../search/SearchModal.svelte'
  import { resolvedRoute } from 'sly-svelte-location-router'
  import { onMount, type Snippet } from 'svelte'
  import { configStore, hiddenElements } from '../framework/configStore'
  import { themed } from '../framework/components'
  import { setupTooltip } from '../framework/tooltip'

  const Header = themed('Header', StockHeader)
  const Announce = themed('Announce', StockAnnounce)
  const Footer = themed('Footer', StockFooter)
  const Sidebar = themed('Sidebar', StockSidebar)
  const SearchModal = themed('SearchModal', StockSearchModal)

  let { children }: { children: Snippet } = $props()

  const hidden = $derived(hiddenElements($configStore, $resolvedRoute?.path ?? '/'))
  const navigation = $derived(!hidden.has('navigation'))

  onMount(setupTooltip)

  let searchOpen = $state(false)
  let drawerOpen = $state(false)
  let collapsed = $state(loadCollapsed())
  let mobile = $state(false)
  let scrolled = $state(false)
  const sidebarOpen = $derived(mobile ? drawerOpen : !collapsed)

  function onScroll(event: Event) {
    const target = event.target as Element
    if (target.classList?.contains('np-main') || target.classList?.contains('np-body')) {
      scrolled = target.scrollTop > 0
    }
  }

  onMount(() => {
    const query = window.matchMedia('(max-width: 1024px)')
    const sync = () => (mobile = query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  })

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
    if (mobile) {
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

<div class="np-app" class:np-drawer-open={drawerOpen} class:np-collapsed={collapsed || !navigation} class:np-navigation-hidden={!navigation} class:np-scrolled={scrolled} onscrollcapture={onScroll}>
  <Announce />
  <Header
    onOpenSearch={() => (searchOpen = true)}
    onToggleDrawer={toggleSidebar}
    {sidebarOpen}
    {navigation}
  />
  <div class="np-body">
    <aside class="np-aside" class:open={drawerOpen && navigation}>
      {#if navigation}
        <Sidebar {collapsed} />
      {/if}
    </aside>
    {#if drawerOpen && navigation}
      <button
        class="np-drawer-backdrop"
        aria-label="Close menu"
        onclick={() => (drawerOpen = false)}
      ></button>
    {/if}
    <main class="np-main">
      {@render children()}
      <Footer />
    </main>
  </div>
  {#if searchOpen}
    <SearchModal onClose={() => (searchOpen = false)} />
  {/if}
</div>

<style>
  .np-app {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    background-color: var(--np-bg);
    color: var(--np-text-primary);
    --np-sidebar-current: var(--np-sidebar-width);
  }
  .np-app.np-drawer-open :global(.np-announce) {
    display: none;
  }
  .np-app.np-collapsed {
    --np-sidebar-current: 0px;
  }
  .np-app.np-navigation-hidden .np-aside {
    display: none;
  }
  .np-body {
    position: relative;
    display: grid;
    grid-template-columns: var(--np-sidebar-current) minmax(0, 1fr);
    min-height: 0;
    transition: grid-template-columns 0.32s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: grid-template-columns;
  }
  .np-aside {
    position: relative;
    height: 100%;
    min-height: 0;
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
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0;
  }
  .np-drawer-backdrop {
    display: none;
  }
  @media (max-width: 1024px) {
    .np-body {
      display: block;
      min-height: 0;
      overflow-y: auto;
    }
    .np-collapsed .np-body {
      display: block;
      grid-template-columns: none;
    }
    .np-main {
      width: 100%;
      height: auto;
      box-sizing: border-box;
      overflow-y: visible;
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
      box-shadow: var(--np-shadow-popover);
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
      background-color: var(--np-overlay-soft);
      z-index: 35;
      border: 0;
      padding: 0;
      cursor: pointer;
    }
  }
</style>
