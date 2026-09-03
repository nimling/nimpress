<script lang="ts">
  import { resolvedRoute } from 'sly-svelte-location-router'
  import { configStore, hiddenElements, withBase, withoutBase } from '../framework/configStore'
  import type { SidebarNode } from '../types'

  const config = $derived($configStore)
  const footer = $derived(config.footer)
  const route = $derived($resolvedRoute?.path ?? '/')
  const hidden = $derived(hiddenElements(config, route))

  function flatten(nodes: SidebarNode[] | undefined, out: SidebarNode[] = []): SidebarNode[] {
    for (const node of nodes ?? []) {
      if (node.link && !node.external && !node.hidden) out.push(node)
      flatten(node.items, out)
    }
    return out
  }

  function clean(path: string): string {
    return withoutBase(path).replace(/\/$/, '') || '/'
  }

  const neighbours = $derived.by(() => {
    if (!footer?.navigation || hidden.has('footer')) return { prev: undefined, next: undefined }
    const pages = flatten(config.manifest?.sidebar)
    const current = clean(route)
    const index = pages.findIndex((node) => clean(node.link ?? '') === current)
    if (index < 0) return { prev: undefined, next: undefined }
    return { prev: pages[index - 1], next: pages[index + 1] }
  })

  const showMeta = $derived(Boolean(footer?.copyright || footer?.social?.length || footer?.generator !== false))
  const isMarkup = (icon: string) => icon.trim().startsWith('<svg')
</script>

{#if footer && (neighbours.prev || neighbours.next || showMeta)}
  <footer class="np-footer">
    {#if neighbours.prev || neighbours.next}
      <nav class="np-footer-nav" aria-label="Previous and next page">
        {#if neighbours.prev}
          <a class="np-footer-prev" href={withBase(neighbours.prev.link ?? '/')} rel="prev">
            <span class="np-footer-nav-label">Previous</span>
            <span class="np-footer-nav-title">{neighbours.prev.text}</span>
          </a>
        {:else}
          <span></span>
        {/if}
        {#if neighbours.next}
          <a class="np-footer-next" href={withBase(neighbours.next.link ?? '/')} rel="next">
            <span class="np-footer-nav-label">Next</span>
            <span class="np-footer-nav-title">{neighbours.next.text}</span>
          </a>
        {/if}
      </nav>
    {/if}
    {#if showMeta}
      <div class="np-footer-meta">
        {#if footer.copyright}
          <span class="np-footer-copyright">{footer.copyright}</span>
        {/if}
        {#if footer.social?.length}
          <div class="np-footer-social">
            {#each footer.social as entry (entry.link)}
              <a class="np-footer-social-link" href={entry.link} target="_blank" rel="noopener" title={entry.name ?? entry.link} aria-label={entry.name ?? entry.link}>
                {#if isMarkup(entry.icon)}
                  {@html entry.icon}
                {:else}
                  <span class="np-footer-social-glyph">{entry.icon}</span>
                {/if}
              </a>
            {/each}
          </div>
        {/if}
        {#if footer.generator !== false}
          <span class="np-footer-generator">Built with <a href="https://nimling.github.io/nimpress" target="_blank" rel="noopener">nimpress</a></span>
        {/if}
      </div>
    {/if}
  </footer>
{/if}

<style>
  .np-footer {
    max-width: var(--np-content-max, 1024px);
    margin: 0 auto;
    padding: 0 48px 48px;
    color: var(--np-text-faint);
    font-size: 13px;
  }
  .np-footer-nav {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 24px 0;
    border-top: 1px solid var(--np-divider);
  }
  .np-footer-prev,
  .np-footer-next {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 16px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    color: var(--np-text-primary);
    text-decoration: none;
    transition: border-color 0.15s ease;
  }
  .np-footer-next {
    text-align: right;
  }
  .np-footer-prev:hover,
  .np-footer-next:hover {
    border-color: var(--np-brand);
  }
  .np-footer-nav-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--np-text-faint);
  }
  .np-footer-nav-title {
    font-weight: 500;
    color: var(--np-brand);
  }
  .np-footer-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px 24px;
    padding-top: 20px;
    border-top: 1px solid var(--np-divider);
  }
  .np-footer-social {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .np-footer-social-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--np-radius-pill);
    color: var(--np-text-muted);
    text-decoration: none;
    transition: color 0.15s ease, background-color 0.15s ease;
  }
  .np-footer-social-link:hover {
    color: var(--np-brand);
    background-color: var(--np-bg-surface);
  }
  .np-footer-social-link :global(svg) {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
  .np-footer-social-glyph {
    font-family: var(--np-font-mono);
    white-space: pre;
  }
  .np-footer-generator a {
    color: inherit;
  }
  @media (max-width: 720px) {
    .np-footer {
      padding: 0 20px 32px;
    }
    .np-footer-nav {
      grid-template-columns: 1fr;
    }
    .np-footer-next {
      text-align: left;
    }
  }
</style>
