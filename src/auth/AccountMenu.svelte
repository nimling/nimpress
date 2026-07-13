<script lang="ts">
  import { viewer, clearViewer } from '../framework/stores/viewer'
  import { startLogin, authConfigured } from './session'

  let open = $state(false)
  let root: HTMLDivElement

  const v = $derived($viewer)
  const initial = $derived(
    (v.email ?? v.firstName ?? '?')[0]?.toUpperCase() ?? '?'
  )

  function onDocClick(e: MouseEvent) {
    if (root && !root.contains(e.target as Node)) open = false
  }

  $effect(() => {
    if (open) {
      window.addEventListener('click', onDocClick)
      return () => window.removeEventListener('click', onDocClick)
    }
  })

  async function logout() {
    open = false
    await clearViewer()
  }

  function login() {
    startLogin(window.location.pathname + window.location.search)
  }
</script>

{#if v.authenticated}
  <div class="np-account" bind:this={root}>
    <button class="np-avatar" onclick={() => (open = !open)} aria-label="Account">
      {initial}
    </button>
    {#if open}
      <div class="np-menu" role="menu">
        <div class="np-menu-head">
          <div class="np-menu-name">{v.firstName ?? v.email}</div>
          <div class="np-menu-mail">{v.email}</div>
        </div>
        <button onclick={logout}>Sign out</button>
      </div>
    {/if}
  </div>
{:else if authConfigured()}
  <button class="np-signin" onclick={login}>Log in</button>
{/if}

<style>
  .np-account { position: relative; }
  .np-avatar {
    width: 32px;
    height: 32px;
    border-radius: 9999px;
    background-color: var(--np-brand);
    color: var(--np-text-on-brand);
    border: 0;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .np-menu {
    position: absolute;
    right: 0;
    top: 40px;
    width: 220px;
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    box-shadow: var(--np-shadow-modal);
    overflow: hidden;
    z-index: 40;
  }
  .np-menu-head {
    padding: 12px;
    border-bottom: 1px solid var(--np-divider);
  }
  .np-menu-name { font-weight: 500; color: var(--np-text-primary); }
  .np-menu-mail { font-size: 12px; color: var(--np-text-muted); }
  .np-menu button {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 10px 12px;
    color: var(--np-text-primary);
    cursor: pointer;
    font-size: 14px;
  }
  .np-menu button:hover { background-color: var(--np-bg-surface); }
  .np-signin {
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--np-border);
    background: transparent;
    border-radius: var(--np-radius-md);
    color: var(--np-text-primary);
    font-size: 13px;
    cursor: pointer;
  }
  .np-signin:hover { background-color: var(--np-bg-surface); }
</style>
