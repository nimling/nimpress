<script lang="ts">
  import type { PageModule, ChangelogEntry } from '../types'

  let { page }: { page: PageModule } = $props()

  const entries = $derived<ChangelogEntry[]>(page.changelogEntries ?? [])

  let openMap = $state<Record<string, boolean>>({})

  function keyOf(e: ChangelogEntry, i: number): string {
    return e.version || `entry-${i}`
  }

  function isOpen(e: ChangelogEntry, i: number): boolean {
    const k = keyOf(e, i)
    if (k in openMap) return openMap[k]
    return i === 0
  }

  function toggle(e: ChangelogEntry, i: number) {
    const k = keyOf(e, i)
    openMap = { ...openMap, [k]: !isOpen(e, i) }
  }

  function expandAll() {
    const next: Record<string, boolean> = {}
    entries.forEach((e, i) => (next[keyOf(e, i)] = true))
    openMap = next
  }

  function collapseAll() {
    const next: Record<string, boolean> = {}
    entries.forEach((e, i) => (next[keyOf(e, i)] = false))
    openMap = next
  }
</script>

<article class="np-changelog">
  <header class="np-changelog-head">
    <h1>{page.frontmatter.title}</h1>
    {#if entries.length > 1}
      <div class="np-changelog-actions">
        <button type="button" onclick={expandAll}>Expand all</button>
        <button type="button" onclick={collapseAll}>Collapse all</button>
      </div>
    {/if}
  </header>

  <ol class="np-changelog-list">
    {#each entries as e, i (keyOf(e, i))}
      {@const open = isOpen(e, i)}
      <li class="np-changelog-entry" class:open>
        <button
          type="button"
          class="np-changelog-toggle"
          aria-expanded={open}
          onclick={() => toggle(e, i)}
        >
          <span class="np-changelog-version">{e.version || 'unreleased'}</span>
          <span class="np-changelog-entry-title">{e.title}</span>
          <span class="np-changelog-chev">{open ? '−' : '+'}</span>
        </button>
        {#if open}
          <div class="np-changelog-body np-prose">
            {@html e.html}
          </div>
        {/if}
      </li>
    {/each}
  </ol>

  {#if entries.length === 0}
    <p class="np-changelog-empty">No entries.</p>
  {/if}
</article>

<style>
  .np-changelog {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    padding: 32px;
    box-sizing: border-box;
  }
  .np-changelog-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .np-changelog-head h1 {
    font-size: 34px;
    font-weight: 700;
    margin: 0;
    color: var(--np-brand);
    letter-spacing: -0.015em;
  }
  .np-changelog-actions {
    display: flex;
    gap: 8px;
  }
  .np-changelog-actions button {
    background: transparent;
    border: 1px solid var(--np-border);
    color: var(--np-text-secondary);
    padding: 6px 12px;
    font-size: 12px;
    border-radius: var(--np-radius-sm);
    cursor: pointer;
  }
  .np-changelog-actions button:hover {
    border-color: var(--np-border-strong);
    color: var(--np-text-primary);
  }

  .np-changelog-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    overflow: hidden;
    background-color: var(--np-bg-card);
  }
  .np-changelog-entry + .np-changelog-entry {
    border-top: 1px solid var(--np-divider);
  }

  .np-changelog-toggle {
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: baseline;
    gap: 16px;
    padding: 16px 20px;
    background: transparent;
    border: 0;
    color: var(--np-text-primary);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
  }
  .np-changelog-toggle:hover {
    background-color: var(--np-bg-surface);
  }
  .np-changelog-version {
    font-family: var(--np-font-mono);
    font-size: 13px;
    color: var(--np-brand);
    padding: 2px 10px;
    background-color: color-mix(in srgb, var(--np-brand) 14%, transparent);
    border-radius: var(--np-radius-pill);
    font-weight: 600;
  }
  .np-changelog-entry-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--np-text-primary);
    min-width: 0;
  }
  .np-changelog-chev {
    font-size: 18px;
    color: var(--np-text-muted);
    font-family: var(--np-font-mono);
    width: 20px;
    text-align: center;
  }

  .np-changelog-body {
    padding: 0 20px 24px;
    border-top: 1px solid var(--np-divider);
  }
  .np-changelog-entry.open .np-changelog-toggle {
    background-color: var(--np-bg-surface);
  }

  .np-changelog-empty {
    color: var(--np-text-muted);
    font-style: italic;
  }
</style>
