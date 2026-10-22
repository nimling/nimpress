<script lang="ts">
  import { configStore } from '../framework/configStore'
  import { dropdownSelection, selectDropdown } from '../framework/stores/dropdown'

  let { placement = 'down' }: { placement?: 'down' | 'up' } = $props()

  const dropdowns = $derived($configStore.manifest?.dropdowns ?? [])

  let openId = $state<string | null>(null)
  let root = $state<HTMLDivElement | undefined>(undefined)

  function choose(id: string, value: string | null) {
    selectDropdown(id, value)
    openId = null
  }

  function onDocClick(e: MouseEvent) {
    if (root && !root.contains(e.target as Node)) openId = null
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') openId = null
  }

  $effect(() => {
    if (!openId) return
    window.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  })
</script>

{#if dropdowns.length}
  <div class="np-dropdown-menu np-dropdown-menu-{placement}" bind:this={root}>
    {#each dropdowns as dropdown (dropdown.id)}
      {@const selected = $dropdownSelection[dropdown.id]}
      <div class="np-dropdown">
        <button
          class="np-dropdown-trigger"
          aria-haspopup="menu"
          aria-expanded={openId === dropdown.id}
          onclick={() => (openId = openId === dropdown.id ? null : dropdown.id)}
        >
          <span class="np-dropdown-title">{dropdown.title}</span>
          <span class="np-dropdown-value">{selected ?? 'All'}</span>
          <svg class="np-dropdown-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {#if openId === dropdown.id}
          <div class="np-dropdown-panel" role="menu" aria-label={dropdown.title}>
            <div class="np-dropdown-head">
              <span class="np-dropdown-head-title">{dropdown.title}</span>
              {#if dropdown.description}
                <span class="np-dropdown-description">{dropdown.description}</span>
              {/if}
            </div>
            <button class="np-dropdown-item" class:active={!selected} role="menuitemradio" aria-checked={!selected} onclick={() => choose(dropdown.id, null)}>All</button>
            {#each dropdown.values as value (value)}
              <button class="np-dropdown-item" class:active={selected === value} role="menuitemradio" aria-checked={selected === value} onclick={() => choose(dropdown.id, value)}>{value}</button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .np-dropdown-menu {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .np-dropdown-menu-up {
    flex: 1;
    flex-direction: column;
    align-items: stretch;
  }
  .np-dropdown {
    position: relative;
    min-width: 0;
  }
  .np-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 34px;
    padding: 0 10px 0 12px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-surface);
    color: var(--np-text-secondary);
    font-size: 13.5px;
    line-height: 1;
    cursor: pointer;
  }
  .np-dropdown-trigger:hover {
    border-color: var(--np-border-strong);
    color: var(--np-text-primary);
  }
  .np-dropdown-title {
    color: var(--np-text-muted);
  }
  .np-dropdown-value {
    flex: 1;
    color: var(--np-text-primary);
    font-weight: 600;
    text-align: left;
  }
  .np-dropdown-chevron {
    flex: 0 0 auto;
    color: var(--np-text-muted);
  }
  .np-dropdown-menu-up .np-dropdown-chevron {
    transform: rotate(180deg);
  }
  .np-dropdown-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 60;
    display: flex;
    flex-direction: column;
    min-width: max(100%, 12rem);
    padding: 6px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-card);
    box-shadow: var(--np-shadow-popover);
  }
  .np-dropdown-menu-up .np-dropdown-panel {
    top: auto;
    bottom: calc(100% + 8px);
    left: 0;
    right: 0;
  }
  .np-dropdown-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 10px 8px;
  }
  .np-dropdown-head-title {
    color: var(--np-text-primary);
    font-size: 13px;
    font-weight: 600;
  }
  .np-dropdown-description {
    color: var(--np-text-muted);
    font-size: 12.5px;
  }
  .np-dropdown-item {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border: 0;
    border-radius: var(--np-radius-sm);
    background: transparent;
    color: var(--np-text-secondary);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
  .np-dropdown-item:hover {
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
  }
  .np-dropdown-item.active {
    color: var(--np-text-primary);
    font-weight: 600;
    background-color: var(--np-bg-surface);
  }
</style>
