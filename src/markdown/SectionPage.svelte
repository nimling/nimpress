<script lang="ts">
  import type { PageModule, SidebarNode } from '../types'
  import { configStore } from '../framework/configStore'
  import Page from './Page.svelte'
  import Card from './Card.svelte'
  import CardGroup from './CardGroup.svelte'

  let { page }: { page: PageModule } = $props()

  const config = $derived($configStore)
  const data = $derived((page.frontmatter.data ?? {}) as Record<string, unknown>)
  const columns = $derived(typeof data.columns === 'number' ? (data.columns as number) : undefined)
  const depth = $derived(data.depth === 2 ? 2 : 1)

  function clean(path: string): string {
    return path.replace(/\/$/, '') || '/'
  }

  function findNode(nodes: SidebarNode[] | undefined, path: string): SidebarNode | undefined {
    for (const node of nodes ?? []) {
      if (node.link && clean(node.link) === path) return node
      const inner = findNode(node.items, path)
      if (inner) return inner
    }
    return undefined
  }

  function listed(nodes: SidebarNode[] | undefined): SidebarNode[] {
    return (nodes ?? []).filter((node) => !node.hidden && !node.external && node.link && !node.link.includes('#'))
  }

  function describe(node: SidebarNode): string {
    return node.slug ? config.manifest?.pages[node.slug]?.description ?? '' : ''
  }

  const own = $derived(findNode(config.manifest?.sidebar, clean(page.path)))
  const children = $derived(listed(own?.items))
</script>

<Page {page}>
  <section class="np-section">
    {#if depth === 2}
      {#each children as child (child.link)}
        {#if listed(child.items).length}
          <h3 class="np-section-group">{child.text}</h3>
          <div class="np-section-grid">
            <CardGroup {columns}>
              {#each listed(child.items) as grandchild (grandchild.link)}
                <Card title={grandchild.text} href={grandchild.link} icon={grandchild.icon}>{describe(grandchild)}</Card>
              {/each}
            </CardGroup>
          </div>
        {:else}
          <div class="np-section-grid">
            <CardGroup {columns}>
              <Card title={child.text} href={child.link} icon={child.icon}>{describe(child)}</Card>
            </CardGroup>
          </div>
        {/if}
      {/each}
    {:else}
      <div class="np-section-grid">
        <CardGroup {columns}>
          {#each children as child (child.link)}
            <Card title={child.text} href={child.link} icon={child.icon}>{describe(child)}</Card>
          {/each}
        </CardGroup>
      </div>
    {/if}
  </section>
</Page>

<style>
  .np-section {
    margin-top: 32px;
  }
  .np-section-group {
    margin: 32px 0 8px;
    font-size: 1.1em;
    color: var(--np-text-primary);
  }
</style>
