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
      {#if crumb.link}
        <a href={crumb.link}>{crumb.text}</a>
      {:else}
        <span>{crumb.text}</span>
      {/if}
      {#if i < trail.length - 1}
        <span class="np-sep">/</span>
      {/if}
    {/each}
  </nav>
{/if}

<style>
  .np-crumbs {
    display: flex;
    gap: 8px;
    font-size: 13px;
    color: var(--np-text-muted);
    margin-bottom: 12px;
  }
  a {
    color: var(--np-text-muted);
    text-decoration: none;
  }
  a:hover { color: var(--np-text-primary); }
  span:not(.np-sep) { color: var(--np-text-primary); }
  .np-sep { color: var(--np-text-faint); }
</style>
