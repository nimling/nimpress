<script lang="ts">
  import Header from './Header.svelte'
  import Sidebar from './Sidebar.svelte'
  import SearchModal from '../search/SearchModal.svelte'
  import { resolvedRoute } from 'sly-svelte-location-router'
  import { onMount, type Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()

  onMount(() => {
    const tip = document.createElement('div')
    tip.className = 'np-tooltip'
    tip.style.display = 'none'
    document.body.appendChild(tip)
    let current: Element | null = null

    function hide() {
      current = null
      tip.style.display = 'none'
    }

    function place(target: Element) {
      const r = target.getBoundingClientRect()
      const tr = tip.getBoundingClientRect()
      let x = r.left + r.width / 2 - tr.width / 2
      x = Math.min(Math.max(4, x), window.innerWidth - tr.width - 4)
      let y = r.bottom + 6
      if (y + tr.height > window.innerHeight - 4) y = r.top - tr.height - 6
      y = Math.min(Math.max(4, y), window.innerHeight - tr.height - 4)
      tip.style.left = `${x}px`
      tip.style.top = `${y}px`
    }

    function over(e: PointerEvent) {
      const target = (e.target as Element | null)?.closest?.('.np-tip') ?? null
      if (!target) return
      const label = target.getAttribute('aria-label')
      if (!label) {
        hide()
        return
      }
      current = target
      tip.textContent = label
      tip.style.display = 'block'
      place(target)
    }

    function out(e: PointerEvent) {
      if (!current) return
      const to = e.relatedTarget as Element | null
      if (to && (current.contains(to) || to.closest?.('.np-tip') === current)) return
      hide()
    }

    document.addEventListener('pointerover', over)
    document.addEventListener('pointerout', out)
    document.addEventListener('pointerdown', hide, true)
    document.addEventListener('scroll', hide, true)
    return () => {
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerout', out)
      document.removeEventListener('pointerdown', hide, true)
      document.removeEventListener('scroll', hide, true)
      tip.remove()
    }
  })

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
  .np-app.np-collapsed {
    --np-sidebar-current: 0px;
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
