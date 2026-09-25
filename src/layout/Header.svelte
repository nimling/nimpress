<script lang="ts">
  import { configStore, hiddenElements, withBase, withoutBase } from '../framework/configStore'
  import { theme, toggleTheme } from '../framework/stores/theme'
  import { resolvedRoute } from 'sly-svelte-location-router'
  import StockAccountMenu from '../auth/AccountMenu.svelte'
  import StockBreadcrumbs from './Breadcrumbs.svelte'
  import StockThemeMenu from './ThemeMenu.svelte'
  import { themed } from '../framework/components'

  const AccountMenu = themed('AccountMenu', StockAccountMenu)
  const Breadcrumbs = themed('Breadcrumbs', StockBreadcrumbs)
  const ThemeMenu = themed('ThemeMenu', StockThemeMenu)

  let {
    onOpenSearch,
    onToggleDrawer,
    sidebarOpen = false,
    navigation = true
  }: {
    onOpenSearch: () => void
    onToggleDrawer?: () => void
    sidebarOpen?: boolean
    navigation?: boolean
  } = $props()

  const config = $derived($configStore)
  const isDark = $derived($theme === 'dark')
  const route = $derived($resolvedRoute)
  const hidden = $derived(hiddenElements(config, route?.path ?? '/'))
  const crumbPath = $derived.by(() => {
    if (hidden.has('path')) return ''
    const path = withoutBase(route?.path ?? '/')
    if (path === '/' || path === '') return ''
    return path.replace(/\/$/, '')
  })
</script>

<header class="np-header">
  <a class="np-brand" href={withBase('/')}>
    {#if config.logo}
      <img src={withBase(config.logo)} alt={config.title} />
    {/if}
    <span>{config.title}</span>
  </a>
  {#if navigation}
    <button
      class="np-menu-btn np-tip"
      class:is-open={sidebarOpen}
      aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      aria-expanded={sidebarOpen}
      onclick={() => onToggleDrawer?.()}
    >
      <svg class="np-menu-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path class="np-menu-fill" d="M9 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h3z" fill="currentColor" stroke="none" />
        <path class="np-menu-pane" d="M9 3v18" />
        <path class="np-menu-chevron" d="M16.5 9 13.5 12l3 3" />
      </svg>
    </button>
  {/if}

  <div class="np-crumbs-slot">
    {#if crumbPath}
      <Breadcrumbs path={crumbPath} />
    {/if}
  </div>

  <div class="np-actions">
    <button class="np-search-trigger" onclick={onOpenSearch}>
      <svg class="np-search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span class="np-search-label">Search</span>
      <kbd>⌘K</kbd>
    </button>

    <ThemeMenu />

    <button class="np-icon-btn np-mode-toggle np-tip" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onclick={toggleTheme}>
      {#if isDark}
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
        </svg>
      {/if}
    </button>

    {#if config.github}
      <a class="np-icon-btn" href={config.github} target="_blank" rel="noopener" aria-label="GitHub">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
      </a>
    {/if}

    <AccountMenu />
  </div>
</header>

<style>
  .np-header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 16px;
    height: var(--np-header-height);
    padding: 0 20px;
    border-bottom: 1px solid var(--np-header-border, var(--np-border));
    background-color: var(--np-header-bg, var(--np-bg));
    color: var(--np-header-text, var(--np-text-primary));
  }
  .np-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--np-text-primary);
    font-weight: 600;
    text-decoration: none;
  }
  .np-brand img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  .np-crumbs-slot {
    display: flex;
    align-items: center;
    min-width: 0;
    width: 100%;
  }

  .np-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-self: end;
  }
  .np-search-trigger {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 38px;
    padding: 0 12px 0 14px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-surface);
    color: var(--np-text-muted);
    font-size: 14px;
    cursor: pointer;
    min-width: 260px;
    line-height: 1;
  }
  .np-search-trigger:hover { border-color: var(--np-border-strong); }
  .np-search-icon {
    flex: 0 0 auto;
    color: var(--np-text-secondary);
  }
  .np-search-label {
    flex: 1;
    text-align: left;
    color: var(--np-text-muted);
  }
  .np-search-trigger kbd {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    font-size: 12.5px;
    font-family: var(--np-font-mono);
    color: var(--np-text-secondary);
    background-color: var(--np-bg);
    line-height: 1;
  }
  .np-icon-btn {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--np-radius-sm);
    border: 0;
    background: transparent;
    color: var(--np-text-secondary);
    cursor: pointer;
    text-decoration: none;
  }
  .np-icon-btn:hover {
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
  }
  .np-menu-btn {
    display: inline-flex;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: var(--np-radius-md);
    background: transparent;
    color: var(--np-text-secondary);
    cursor: pointer;
    padding: 0;
  }
  .np-menu-btn:hover {
    color: var(--np-text-primary);
    background-color: var(--np-bg-surface);
  }
  .np-menu-fill {
    opacity: 0;
    transition: opacity 0.24s ease;
  }
  .np-menu-btn.is-open .np-menu-fill {
    opacity: 0.18;
  }
  .np-menu-chevron {
    transform-origin: 15px 12px;
    transform: rotate(180deg);
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .np-menu-btn.is-open .np-menu-chevron {
    transform: rotate(0deg);
  }
  @media (prefers-reduced-motion: reduce) {
    .np-menu-fill,
    .np-menu-chevron {
      transition: none;
    }
  }
  @media (max-width: 1024px) {
    .np-header {
      gap: 12px;
      padding: 0 12px;
    }
    .np-menu-btn {
      order: -1;
    }
    .np-search-trigger {
      min-width: 0;
      width: 36px;
      padding: 0;
      justify-content: center;
    }
    .np-search-label,
    .np-search-trigger kbd { display: none; }
  }
</style>
