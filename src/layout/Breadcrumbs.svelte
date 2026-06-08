<script lang="ts">
  import { configStore } from '../framework/configStore'

  let { slug = '' }: { slug?: string } = $props()

  const trail = $derived.by(() => {
    const config = $configStore
    const segments = slug.split('/').filter(Boolean)
    const result: { text: string; link?: string }[] = []
    let path = ''
    for (let i = 0; i < segments.length; i++) {
      path += '/' + segments[i]
      const meta = config.manifest?.pages[path.replace(/^\//, '')]
      result.push({
        text: meta?.title ?? segments[i],
        link: i === segments.length - 1 ? undefined : path
      })
    }
    return result
  })
</script>

{#if trail.length > 1}
  <nav class="np-crumbs" aria-label="Breadcrumb">
    {#each trail as crumb, i (crumb.text + i)}
      {#if i > 0}
        <span class="np-crumbs-sep" aria-hidden="true">/</span>
      {/if}
      {#if crumb.link}
        <a class="np-crumbs-item" href={crumb.link}>{crumb.text}</a>
      {:else}
        <span class="np-crumbs-item np-crumbs-current">{crumb.text}</span>
      {/if}
    {/each}
  </nav>
{/if}

<style>
  .np-crumbs {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    font-size: 13px;
    color: var(--np-text-muted);
    min-width: 0;
    width: 100%;
  }
  .np-crumbs-item {
    color: var(--np-text-muted);
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 0 1 auto;
  }
  .np-crumbs-item:hover {
    color: var(--np-text-primary);
  }
  .np-crumbs-current {
    color: var(--np-text-primary);
    font-weight: 500;
    flex: 0 1 auto;
  }
  .np-crumbs-sep {
    color: var(--np-text-faint);
    flex: 0 0 auto;
    user-select: none;
  }
</style>
