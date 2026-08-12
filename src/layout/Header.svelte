<script lang="ts">
  import { configStore } from '../framework/configStore'
  import { theme, toggleTheme } from '../framework/stores/theme'
  import { resolvedRoute } from 'sly-svelte-location-router'
  import AccountMenu from '../auth/AccountMenu.svelte'
  import Breadcrumbs from './Breadcrumbs.svelte'
  import SubscribeDialog from '../markdown/SubscribeDialog.svelte'
  import { pageFeed } from '../framework/stores/feed'

  let {
    onOpenSearch,
    onToggleDrawer,
    drawerOpen = false
  }: {
    onOpenSearch: () => void
    onToggleDrawer?: () => void
    drawerOpen?: boolean
  } = $props()

  const config = $derived($configStore)
  const isDark = $derived($theme === 'dark')
  const feed = $derived($pageFeed)
  let subscribeOpen = $state(false)
  const route = $derived($resolvedRoute)
  const crumbPath = $derived.by(() => {
    const path = route?.path ?? '/'
    if (path === '/' || path === '') return ''
    return path.replace(/\/$/, '')
  })
</script>

<header class="np-header">
  <button
    class="np-menu-btn"
    class:is-open={drawerOpen}
    aria-label="Toggle menu"
    aria-expanded={drawerOpen}
    onclick={() => onToggleDrawer?.()}
  >
    <span class="np-menu-icon" aria-hidden="true">
      <span class="np-menu-line np-menu-line-top"></span>
      <span class="np-menu-line np-menu-line-mid"></span>
      <span class="np-menu-line np-menu-line-bot"></span>
    </span>
  </button>
  <a class="np-brand" href="/">
    {#if config.logo}
      <img src={config.logo} alt={config.title} />
    {/if}
    <span>{config.title}</span>
  </a>

  <div class="np-crumbs-slot">
    {#if crumbPath}
      <Breadcrumbs path={crumbPath} />
    {/if}
  </div>

  <div class="np-actions">
    {#if feed}
      <button type="button" class="np-subscribe-btn" onclick={() => (subscribeOpen = true)}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M6.18 17.82a2.18 2.18 0 1 1-4.36 0 2.18 2.18 0 0 1 4.36 0zM1.82 8.73v3.09c5.72 0 10.36 4.64 10.36 10.36h3.09c0-7.43-6.02-13.45-13.45-13.45zM1.82 2.18v3.09c10.34 0 18.73 8.39 18.73 18.73h3.09C23.64 11.95 13.87 2.18 1.82 2.18z"/>
        </svg>
        <span class="np-subscribe-label">Subscribe</span>
      </button>
    {/if}

    <button class="np-search-trigger" onclick={onOpenSearch}>
      <svg class="np-search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span class="np-search-label">Search</span>
      <kbd>⌘K</kbd>
    </button>

    <button class="np-icon-btn" aria-label="Toggle theme" onclick={toggleTheme}>
      {isDark ? '☀' : '☾'}
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

{#if subscribeOpen && feed}
  <SubscribeDialog
    title={feed.title}
    feedPath={feed.feedPath}
    emailEnabled={feed.emailEnabled}
    onClose={() => (subscribeOpen = false)}
  />
{/if}

<style>
  .np-subscribe-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-pill);
    background: none;
    color: var(--np-text-muted);
    font-size: 13px;
    padding: 6px 14px;
    cursor: pointer;
    white-space: nowrap;
  }
  .np-subscribe-btn:hover {
    color: var(--np-text-primary);
    border-color: var(--np-brand);
  }
  @media (max-width: 720px) {
    .np-subscribe-label {
      display: none;
    }
    .np-subscribe-btn {
      padding: 6px 10px;
    }
  }
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
    background: transparent;
    color: var(--np-text-secondary);
    cursor: pointer;
    padding: 0;
  }
  .np-menu-btn:hover { color: var(--np-text-primary); }
  .np-menu-icon {
    position: relative;
    display: inline-block;
    width: 20px;
    height: 16px;
  }
  .np-menu-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background-color: currentColor;
    border-radius: 2px;
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease, top 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: 50% 50%;
  }
  .np-menu-line-top { top: 0; }
  .np-menu-line-mid { top: 7px; }
  .np-menu-line-bot { top: 14px; }
  .np-menu-btn.is-open .np-menu-line-top {
    top: 7px;
    transform: rotate(45deg);
  }
  .np-menu-btn.is-open .np-menu-line-mid {
    opacity: 0;
    transform: scaleX(0);
  }
  .np-menu-btn.is-open .np-menu-line-bot {
    top: 7px;
    transform: rotate(-45deg);
  }
  @media (max-width: 1024px) {
    .np-header {
      gap: 12px;
      padding: 0 12px;
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
