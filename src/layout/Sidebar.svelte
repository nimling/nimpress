<script lang="ts">
  import { tick } from 'svelte'
  import { configStore } from '../framework/configStore'
  import { resolvedRoute } from '../router'
  import { sidebarState, setGroupOpen } from '../framework/stores/sidebar'
  import SidebarNode from './SidebarNode.svelte'
  import type { SidebarNode as SidebarNodeType } from '../types'

  let nav: HTMLElement

  const sidebar = $derived($configStore.manifest?.sidebar ?? [])
  const routePath = $derived($resolvedRoute?.path ?? '/')

  function findChain(
    nodes: SidebarNodeType[],
    target: string,
    parentKey: string | null,
    chain: string[]
  ): string[] | null {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const childKey = n.link ?? n.slug ?? (parentKey === null ? `root-${i}` : `i${i}`)
      const key = parentKey === null ? childKey : `${parentKey}/${childKey}`
      if (n.link === target) {
        return chain
      }
      if (n.items?.length) {
        const sub = findChain(n.items, target, key, [...chain, key])
        if (sub) return sub
      }
    }
    return null
  }

  $effect(() => {
    const target = routePath
    const ancestors = findChain(sidebar, target, null, [])
    if (!ancestors) return
    for (const k of ancestors) setGroupOpen(k, false)
    void (async () => {
      await tick()
      if (!nav) return
      const active = nav.querySelector('.np-link.active, .np-group-label-link.active') as HTMLElement | null
      if (active && typeof active.scrollIntoView === 'function') {
        const rect = active.getBoundingClientRect()
        const navRect = nav.getBoundingClientRect()
        const visible = rect.top >= navRect.top && rect.bottom <= navRect.bottom
        if (!visible) {
          active.scrollIntoView({ block: 'center', behavior: 'auto' })
        }
      }
    })()
  })
</script>

<nav class="np-sidebar" bind:this={nav}>
  {#each sidebar as node, i (node.link ?? node.slug ?? `root-${i}`)}
    <SidebarNode {node} depth={0} groupKey={node.link ?? node.slug ?? `root-${i}`} />
  {/each}
</nav>

<style>
  .np-sidebar {
    padding: 24px 16px;
    font-size: 14px;
  }
</style>
