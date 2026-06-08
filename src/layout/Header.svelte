<script lang="ts">
  import { configStore } from '../framework/configStore'
  import { theme, toggleTheme } from '../framework/stores/theme'
  import { resolvedRoute } from '../router'
  import AccountMenu from '../auth/AccountMenu.svelte'
  import Breadcrumbs from './Breadcrumbs.svelte'

  let {
    onOpenSearch,
    onToggleDrawer
  }: {
    onOpenSearch: () => void
    onToggleDrawer?: () => void
  } = $props()

  const config = $derived($configStore)
  const isDark = $derived($theme === 'dark')
  const route = $derived($resolvedRoute)
  const slug = $derived.by(() => {
    const path = route?.path ?? '/'
    if (path === '/' || path === '') return ''
    const cleaned = path.replace(/\/$/, '')
    const byPath = config.manifest?.byPath
    if (byPath && byPath[cleaned] !== undefined) return byPath[cleaned]
    return cleaned.replace(/^\//, '')
  })
</script>

<header class="np-header">
  <button
    class="np-menu-btn"
    aria-label="Toggle menu"
    onclick={() => onToggleDrawer?.()}
  >
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  </button>
  <a class="np-brand" href="/">
    {#if config.logo}
      <img src={config.logo} alt={config.title} />
    {/if}
    <span>{config.title}</span>
  </a>

  <div class="np-crumbs-slot">
    {#if slug}
      <Breadcrumbs {slug} />
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

<style>
  .np-header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 32px;
    height: var(--np-header-height);
    padding: 0 24px;
    border-bottom: 1px solid var(--np-border);
    background-color: var(--np-bg);
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
    overflow: hidden;
  }
  .np-crumbs-slot :global(.np-crumbs) {
    margin: 0;
    font-size: 13px;
    color: var(--np-text-muted);
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
    display: none;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    background-color: var(--np-bg-surface);
    color: var(--np-text-secondary);
    cursor: pointer;
    padding: 0;
  }
  .np-menu-btn:hover {
    color: var(--np-text-primary);
    border-color: var(--np-border-strong);
  }
  @media (max-width: 1024px) {
    .np-menu-btn { display: inline-flex; }
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
