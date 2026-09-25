<script lang="ts">
  import { siteTheme, siteThemes, selectSiteTheme } from '../framework/stores/theme'

  let open = $state(false)
  let root = $state<HTMLDivElement | undefined>(undefined)

  function label(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  function choose(name: string) {
    selectSiteTheme(name)
    open = false
  }

  function onDocClick(e: MouseEvent) {
    if (root && !root.contains(e.target as Node)) open = false
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false
  }

  $effect(() => {
    if (!open) return
    window.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  })
</script>

{#if $siteThemes.length > 1}
  <div class="np-theme-menu" bind:this={root}>
    <button
      class="np-icon-btn np-theme-menu-trigger np-tip"
      aria-label="Theme"
      aria-haspopup="menu"
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.8 3.5-4 3.5h-2a2 2 0 0 0-1.5 3.3c.8.9.3 3.2-2.5 3.2Z" />
        <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
        <circle cx="10.5" cy="6.5" r="1" fill="currentColor" />
        <circle cx="15.5" cy="7.5" r="1" fill="currentColor" />
      </svg>
    </button>
    {#if open}
      <div class="np-theme-menu-list" role="menu">
        {#each $siteThemes as name (name)}
          <button
            class="np-theme-menu-item"
            class:active={$siteTheme === name}
            role="menuitemradio"
            aria-checked={$siteTheme === name}
            onclick={() => choose(name)}
          >
            <span class="np-theme-menu-swatch np-theme-menu-swatch-{name}" aria-hidden="true"></span>
            {label(name)}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .np-theme-menu {
    position: relative;
  }
  .np-theme-menu-trigger {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: var(--np-radius-sm);
    background: transparent;
    color: var(--np-text-secondary);
    cursor: pointer;
  }
  .np-theme-menu-trigger:hover {
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
  }
  .np-theme-menu-list {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 60;
    display: flex;
    flex-direction: column;
    min-width: 10rem;
    padding: 6px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-card);
    box-shadow: var(--np-shadow-popover);
  }
  .np-theme-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 0;
    border-radius: var(--np-radius-sm);
    background: transparent;
    color: var(--np-text-secondary);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
  .np-theme-menu-item:hover {
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
  }
  .np-theme-menu-item.active {
    color: var(--np-text-primary);
    font-weight: 600;
  }
  .np-theme-menu-swatch {
    width: 14px;
    height: 14px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-border-strong);
    background-color: var(--np-bg);
  }
  .np-theme-menu-swatch-glass {
    background-image: radial-gradient(circle at 20% 20%, var(--np-brand), transparent 75%);
  }
  .np-theme-menu-item.active .np-theme-menu-swatch {
    box-shadow: 0 0 0 2px var(--np-bg-card), 0 0 0 3px var(--np-brand);
  }
</style>
