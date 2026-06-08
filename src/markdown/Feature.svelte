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

  const isImage = $derived(
    !!icon &&
      (/^(https?:)?\/\//.test(icon) ||
        icon.startsWith('/') ||
        icon.startsWith('./') ||
        icon.startsWith('../') ||
        /\.(svg|png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(icon))
  )
</script>

<svelte:element this={link ? 'a' : 'div'} class="np-feature-card" href={link || undefined}>
  {#if icon}
    {#if isImage}
      <img class="np-feature-icon np-feature-icon-img" src={icon} alt="" />
    {:else}
      <span class="np-feature-icon np-feature-icon-text">{icon}</span>
    {/if}
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
    height: 100%;
    box-sizing: border-box;
    align-items: flex-start;
  }
  a.np-feature-card:hover {
    border-color: var(--np-brand);
    transform: translateY(-2px);
  }
  .np-feature-icon {
    flex: 0 0 auto;
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .np-feature-icon-text {
    font-size: 32px;
    line-height: 1;
  }
  .np-feature-icon-img {
    width: 48px;
    height: 48px;
    object-fit: contain;
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
