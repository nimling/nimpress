<script lang="ts">
  import type { PageModule } from '../types'
  import { configStore, withBase } from '../framework/configStore'
  import Page from './Page.svelte'

  let { page }: { page: PageModule } = $props()

  const tags = $derived($configStore.manifest?.tags ?? [])
</script>

<Page {page}>
  <div class="np-tags-index">
    {#each tags as tag (tag.slug)}
      <section class="np-tags-section" id={tag.slug}>
        <h2 class="np-tags-heading">
          {#if tag.icon}<span class="np-tag-icon">{#if tag.icon.trim().startsWith('<svg')}{@html tag.icon}{:else}{tag.icon}{/if}</span>{/if}
          <span>{tag.name}</span>
          <span class="np-tags-count">{tag.pages.length}</span>
        </h2>
        <ul class="np-tags-list">
          {#each tag.pages as entry (entry.slug)}
            <li class="np-tags-item">
              <a href={withBase(entry.path)}>{entry.title}</a>
              {#if entry.description}<p class="np-tags-description">{entry.description}</p>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</Page>

<style>
  .np-tags-index {
    margin-top: 24px;
  }
  .np-tags-section {
    margin-top: 32px;
  }
  .np-tags-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.25em;
    margin: 0 0 12px;
    color: var(--np-text-primary);
  }
  .np-tags-heading :global(.np-tag-icon) {
    width: 18px;
    height: 18px;
  }
  .np-tags-count {
    font-size: 12px;
    padding: 1px 8px;
    border-radius: var(--np-radius-pill);
    background-color: var(--np-bg-surface);
    color: var(--np-text-muted);
  }
  .np-tags-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .np-tags-item {
    padding: 10px 14px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
  }
  .np-tags-item a {
    color: var(--np-brand);
    font-weight: 500;
    text-decoration: none;
  }
  .np-tags-description {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--np-text-muted);
  }
</style>
