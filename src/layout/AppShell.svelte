<script lang="ts">
  import Header from './Header.svelte'
  import Sidebar from './Sidebar.svelte'
  import SearchModal from '../search/SearchModal.svelte'
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()

  let searchOpen = $state(false)

  function onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      searchOpen = true
    }
    if (e.key === 'Escape') searchOpen = false
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="np-app">
  <Header onOpenSearch={() => (searchOpen = true)} />
  <div class="np-body">
    <aside class="np-aside">
      <Sidebar />
    </aside>
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
    min-height: 100vh;
    background-color: var(--np-bg);
    color: var(--np-text-primary);
  }
  .np-body {
    display: grid;
    grid-template-columns: var(--np-sidebar-width) minmax(0, 1fr);
    align-items: start;
  }
  .np-aside {
    position: sticky;
    top: var(--np-header-height);
    height: calc(100vh - var(--np-header-height));
    overflow-y: auto;
    border-right: 1px solid var(--np-border);
    background-color: var(--np-bg-sidebar);
  }
  .np-main {
    min-height: calc(100vh - var(--np-header-height));
    padding: 32px;
  }
  @media (max-width: 1024px) {
    .np-body { grid-template-columns: 1fr; }
    .np-aside { display: none; }
  }
</style>
