<script lang="ts">
  import { Router } from '../router'
  import type { Routes } from '../router'
  import AppShell from './AppShell.svelte'
  import App from './App.svelte'

  const routes: Routes = {
    '/': {
      name: 'shell',
      component: () => Promise.resolve({ default: App })
    }
  }
</script>

<AppShell>
  <Router {routes} fallback="/">
    <div class="np-loading">
      <span class="np-spinner"></span>
    </div>
  </Router>
</AppShell>

<style>
  .np-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
  }
  .np-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--np-border);
    border-top-color: var(--np-brand);
    border-radius: 9999px;
    animation: np-spin 0.8s linear infinite;
  }
  @keyframes np-spin {
    to { transform: rotate(360deg); }
  }
</style>
