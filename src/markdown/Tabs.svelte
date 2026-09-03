<script lang="ts">
  import { onMount } from 'svelte'
  import type { Snippet } from 'svelte'
  import { configStore } from '../framework/configStore'
  import { linkedTab, selectLinkedTab } from '../framework/stores/tabs'

  export interface Tab {
    label: string
    id: string
  }

  let {
    tabs,
    active = $bindable(0),
    linked = false,
    code = false,
    panel,
    bar
  }: {
    tabs: Tab[]
    active?: number
    linked?: boolean
    code?: boolean
    panel: Snippet<[Tab, number]>
    bar?: Snippet
  } = $props()

  let buttons = $state<HTMLButtonElement[]>([])
  let seen = $linkedTab

  const isLinked = $derived(linked || $configStore.tabs?.linked === true)

  function selectId(id: string): boolean {
    const index = tabs.findIndex((tab) => tab.id === id)
    if (index < 0) return false
    active = index
    return true
  }

  function select(index: number) {
    active = index
    buttons[index]?.focus()
    if (isLinked) selectLinkedTab(tabs[index].id)
  }

  function onKeydown(event: KeyboardEvent) {
    const last = tabs.length - 1
    const next =
      event.key === 'ArrowRight' ? (active === last ? 0 : active + 1)
      : event.key === 'ArrowLeft' ? (active === 0 ? last : active - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : -1
    if (next < 0) return
    event.preventDefault()
    select(next)
  }

  $effect(() => {
    const id = $linkedTab
    if (id === seen) return
    seen = id
    if (isLinked) selectId(id)
  })

  onMount(() => {
    const fromHash = () => selectId(decodeURIComponent(window.location.hash.slice(1)))
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('a[href*="#"]')) fromHash()
    }
    if (!fromHash() && isLinked) selectId($linkedTab)
    window.addEventListener('hashchange', fromHash)
    window.addEventListener('popstate', fromHash)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('hashchange', fromHash)
      window.removeEventListener('popstate', fromHash)
      document.removeEventListener('click', onClick)
    }
  })
</script>

<div class="np-tabs" class:np-tabs-code={code} class:np-code-group={code}>
  <div class="np-tabs-bar" class:np-code-group-bar={code}>
    <div class="np-tabs-list" class:np-code-group-tabs={code} role="tablist">
      {#each tabs as tab, i (tab.id + i)}
        <button
          type="button"
          class="np-tabs-tab"
          class:active={active === i}
          id={tab.id}
          role="tab"
          aria-selected={active === i}
          tabindex={active === i ? 0 : -1}
          bind:this={buttons[i]}
          onclick={() => select(i)}
          onkeydown={onKeydown}
        >{tab.label}</button>
      {/each}
    </div>
    {#if bar}{@render bar()}{/if}
  </div>
  {#each tabs as tab, i (tab.id + i)}
    <div class="np-tabs-panel" class:np-code-group-body={code} role="tabpanel" hidden={active !== i}>
      {@render panel(tab, i)}
    </div>
  {/each}
</div>

<style>
  .np-tabs {
    margin: 16px 0;
  }
  .np-tabs-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--np-border);
  }
  .np-tabs-list {
    display: flex;
    gap: 2px;
    flex: 1;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .np-tabs-list::-webkit-scrollbar { display: none; }
  .np-tabs-tab {
    background: transparent;
    border: 0;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    color: var(--np-text-secondary);
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
    padding: 8px 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: color 150ms ease, border-color 150ms ease;
  }
  .np-tabs-tab:hover {
    color: var(--np-text-primary);
  }
  .np-tabs-tab.active {
    color: var(--np-brand);
    border-bottom-color: var(--np-brand);
  }
  .np-tabs-tab:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: -2px;
    border-radius: var(--np-radius-sm);
  }
  .np-tabs-panel {
    padding: 12px 0 0;
  }
  .np-tabs-panel[hidden] {
    display: none;
  }
  .np-tabs-panel > :global(:last-child),
  .np-tabs-panel :global(.np-tabs-body > :last-child) {
    margin-bottom: 0;
  }
  .np-tabs-code {
    border-radius: var(--np-radius-md);
    overflow: hidden;
    background-color: var(--np-bg-code-block);
    border: 1px solid var(--np-border);
  }
  .np-tabs-code .np-tabs-bar {
    padding: 0 8px;
    background-color: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    height: 38px;
  }
  .np-tabs-code .np-tabs-tab {
    color: rgba(229, 231, 235, 0.5);
    font-size: 12px;
    font-weight: 400;
    font-family: var(--np-font-mono);
    text-transform: lowercase;
  }
  .np-tabs-code .np-tabs-tab:hover {
    color: rgba(229, 231, 235, 0.9);
  }
  .np-tabs-code .np-tabs-tab.active {
    color: var(--np-brand);
    border-bottom-color: var(--np-brand);
  }
  .np-tabs-code .np-tabs-panel {
    padding: 0;
  }
  .np-tabs-code .np-tabs-panel :global(pre) {
    margin: 0;
    border-radius: 0;
    padding: 16px;
    background: transparent;
  }
</style>
