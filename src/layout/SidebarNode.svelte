<script lang="ts">
  import { sidebarState, toggleGroup } from '../framework/stores/sidebar'
  import { viewer } from '../framework/stores/viewer'
  import { viewerCanAccess } from '../auth/guard'
  import { resolvedRoute } from 'sly-svelte-location-router'
  import type { SidebarNode } from '../types'

  let {
    node,
    depth = 0,
    groupKey
  }: { node: SidebarNode; depth?: number; groupKey: string } = $props()

  const route = $derived($resolvedRoute)
  const stored = $derived($sidebarState[groupKey])
  const open = $derived(
    stored !== undefined ? !stored : node.collapsed === false
  )
  const isGroup = $derived(!!(node.items && node.items.length))
  const v = $derived($viewer)
  const visible = $derived(
    viewerCanAccess({ scope: node.scope, claim: node.claim }, v)
  )
  const active = $derived(
    !!route && !!node.link && route.path === node.link
  )
</script>

{#if visible}
  {#if isGroup}
    {#if depth === 0}
      <div class="np-group">
        <div class="np-group-header" class:active>
          {#if node.link}
            <a class="np-group-label-link" href={node.link} class:active>{node.text}{#if node.hidden}<span class="np-hidden-dot" title="Hidden, local dev only, excluded from the build"></span>{/if}</a>
          {:else}
            <button class="np-group-label np-group-label-button" onclick={() => toggleGroup(groupKey, open)}>{node.text}</button>
          {/if}
          <button
            class="np-group-toggle"
            aria-label="Toggle {node.text}"
            onclick={() => toggleGroup(groupKey, open)}
          >
            <span class="np-chev" class:open>›</span>
          </button>
        </div>
        {#if open}
          <ul class="np-items">
            {#each node.items! as child, i (child.link ?? child.slug ?? `${groupKey}-${i}`)}
              <li>
                <svelte:self node={child} depth={depth + 1} groupKey={`${groupKey}/${child.link ?? child.slug ?? `i${i}`}`} />
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {:else}
      <div class="np-subgroup-row" class:active>
        {#if node.link}
          <a class="np-link np-subgroup-link" href={node.link} class:active>{node.text}{#if node.hidden}<span class="np-hidden-dot" title="Hidden, local dev only, excluded from the build"></span>{/if}</a>
        {:else}
          <button class="np-subgroup-static np-subgroup-button" onclick={() => toggleGroup(groupKey, open)}>{node.text}</button>
        {/if}
        <button
          class="np-subgroup-toggle"
          aria-label="Toggle {node.text}"
          onclick={() => toggleGroup(groupKey, open)}
        >
          <span class="np-chev" class:open>›</span>
        </button>
      </div>
      {#if open}
        <ul class="np-subitems">
          {#each node.items! as child, i (child.link ?? child.slug ?? `${groupKey}-${i}`)}
            <li>
              <svelte:self node={child} depth={depth + 1} groupKey={`${groupKey}/${child.link ?? child.slug ?? `i${i}`}`} />
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  {:else}
    <a href={node.link ?? '#'} class="np-link" class:active>
      {node.text}{#if node.hidden}<span class="np-hidden-dot" title="Hidden, local dev only, excluded from the build"></span>{/if}
    </a>
  {/if}
{/if}

<style>
  .np-group { margin-bottom: 12px; }

  .np-hidden-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-left: 6px;
    border-radius: 50%;
    background-color: var(--np-danger, #e5484d);
    vertical-align: middle;
  }

  .np-group-header,
  .np-subgroup-row {
    display: flex;
    align-items: stretch;
    gap: 0;
    padding: 0;
    border-radius: var(--np-radius-md);
  }
  .np-group-header.active,
  .np-subgroup-row.active {
    background-color: color-mix(in srgb, var(--np-brand) 16%, transparent);
  }
  .np-group-header.active .np-group-label-link,
  .np-subgroup-row.active .np-subgroup-link {
    color: var(--np-brand);
  }
  .np-group-header.active .np-group-toggle,
  .np-subgroup-row.active .np-subgroup-toggle {
    color: var(--np-brand);
  }

  .np-group-label,
  .np-group-label-link,
  .np-group-label-button {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--np-text-muted);
    text-decoration: none;
    background: transparent;
    border: 0;
    text-align: left;
    cursor: default;
  }
  .np-group-label-link,
  .np-group-label-button { cursor: pointer; }
  .np-group-label-link:hover,
  .np-group-label-button:hover { color: var(--np-text-primary); }
  .np-group-label-link.active { color: var(--np-brand); }

  .np-subgroup-link,
  .np-subgroup-static,
  .np-subgroup-button {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    font-size: 14px;
    color: var(--np-text-secondary);
    text-decoration: none;
    background: transparent;
    border: 0;
    text-align: left;
    cursor: default;
  }
  .np-subgroup-link,
  .np-subgroup-button { cursor: pointer; }
  .np-subgroup-link:hover,
  .np-subgroup-button:hover { color: var(--np-text-primary); }
  .np-subgroup-link.active {
    color: var(--np-text-primary);
    font-weight: 500;
  }

  .np-group-toggle,
  .np-subgroup-toggle {
    flex: 0 0 28px;
    background: transparent;
    border: 0;
    padding: 0 8px 0 0;
    cursor: pointer;
    color: var(--np-text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    line-height: 1;
  }
  .np-group-toggle:hover,
  .np-subgroup-toggle:hover { color: var(--np-text-primary); }

  .np-chev {
    display: inline-block;
    font-size: 20px;
    line-height: 1;
    transition: transform 150ms ease;
  }
  .np-chev.open { transform: rotate(90deg); }

  .np-items,
  .np-subitems { list-style: none; margin: 0; padding: 0; }
  .np-subitems {
    padding-left: 12px;
    border-left: 1px solid var(--np-divider);
    margin-left: 8px;
  }

  .np-link {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    padding-right: 28px;
    border-radius: var(--np-radius-md);
    color: var(--np-text-secondary);
    text-decoration: none;
    font-size: 14px;
  }
  .np-link:hover {
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
  }
  .np-link.active {
    color: var(--np-brand);
    background-color: color-mix(in srgb, var(--np-brand) 16%, transparent);
    font-weight: 500;
  }
  .np-subgroup-row.active .np-link.active {
    background-color: transparent;
  }
</style>
