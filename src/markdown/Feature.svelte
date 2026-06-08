<script lang="ts">
  let {
    title = '',
    icon = '',
    link = '',
    bodyHtml = ''
  }: {
    title?: string
    icon?: string
    link?: string
    bodyHtml?: string
  } = $props()
</script>

<svelte:element this={link ? 'a' : 'div'} class="np-feature-card" href={link || undefined}>
  {#if icon}
    <span class="np-feature-icon">{icon}</span>
  {/if}
  <div class="np-feature-content">
    {#if title}<h3>{title}</h3>{/if}
    <div class="np-feature-body">{@html bodyHtml}</div>
  </div>
</svelte:element>

<style>
  .np-feature-card {
    display: flex;
    gap: 16px;
    padding: 22px;
    border-radius: var(--np-radius-lg);
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  a.np-feature-card:hover {
    border-color: var(--np-brand);
    transform: translateY(-2px);
  }
  .np-feature-icon {
    font-size: 24px;
    line-height: 1;
    flex: 0 0 auto;
  }
  .np-feature-content { min-width: 0; }
  .np-feature-content h3 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
    color: var(--np-text-primary);
  }
  .np-feature-body {
    color: var(--np-text-secondary);
    font-size: 14px;
    line-height: 1.55;
  }
  .np-feature-body :global(p) { margin: 0 0 8px; }
  .np-feature-body :global(p:last-child) { margin-bottom: 0; }
</style>
