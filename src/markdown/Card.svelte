<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    href,
    icon,
    children
  }: { title: string; href?: string; icon?: string; children?: Snippet } = $props()
</script>

<svelte:element
  this={href ? 'a' : 'div'}
  href={href}
  class="np-card"
>
  {#if icon}<div class="np-card-icon">{icon}</div>{/if}
  <h3>{title}</h3>
  {#if children}<div class="np-card-body">{@render children()}</div>{/if}
</svelte:element>

<style>
  .np-card {
    display: block;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    padding: 20px;
    background-color: var(--np-bg-card);
    color: var(--np-text-primary);
    text-decoration: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .np-card:hover {
    border-color: var(--np-brand);
    box-shadow: var(--np-shadow-card);
  }
  .np-card-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }
  h3 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
  }
  .np-card-body {
    color: var(--np-text-secondary);
    font-size: 14px;
  }
</style>
