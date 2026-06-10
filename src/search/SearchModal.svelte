<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { configStore } from '../framework/configStore'
  import { viewer } from '../framework/stores/viewer'
  import { buildIndex, searchIndex } from './indexer'
  import { navigate } from '../router'

  let { onClose }: { onClose: () => void } = $props()

  let query = $state('')
  let input: HTMLInputElement
  let listEl: HTMLUListElement
  let activeIndex = $state(0)

  const index = $derived.by(() => {
    const entries = $configStore.searchIndex ?? []
    return entries.length ? buildIndex(entries) : null
  })

  const results = $derived(
    index ? searchIndex(query, $viewer, index) : []
  )

  $effect(() => {
    query
    activeIndex = 0
  })

  function go(slug: string) {
    onClose()
    navigate('/' + slug)
  }

  async function ensureVisible() {
    await tick()
    if (!listEl) return
    const item = listEl.children[activeIndex] as HTMLElement | undefined
    if (item && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ block: 'nearest' })
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (results.length === 0) return
      activeIndex = (activeIndex + 1) % results.length
      void ensureVisible()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length === 0) return
      activeIndex = (activeIndex - 1 + results.length) % results.length
      void ensureVisible()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[activeIndex]
      if (r) go(r.slug as string)
      return
    }
  }

  onMount(() => {
    input?.focus()
  })
</script>

<svelte:window onkeydown={onKey} />

<div
  class="np-search-backdrop"
  onclick={onClose}
  role="presentation"
>
  <div
    class="np-search-modal"
    role="dialog"
    aria-label="Search"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="np-search-head">
      <span class="np-search-icon" aria-hidden="true">⌕</span>
      <input
        bind:this={input}
        bind:value={query}
        placeholder="Search pages, tags, headings… use 'api/' to scope to a folder"
        class="np-search-input"
        autocomplete="off"
        spellcheck="false"
      />
      <button class="np-search-close" onclick={onClose} aria-label="Close">Esc</button>
    </div>

    <ul class="np-results" bind:this={listEl}>
      {#each results as r, i (r.slug || `res-${i}`)}
        <li class:active={i === activeIndex}>
          <button onclick={() => go(r.slug as string)} onmouseenter={() => (activeIndex = i)}>
            <div class="np-result-title">{r.title}</div>
            {#if Array.isArray(r.tags) && r.tags.length}
              <div class="np-result-tags">
                {#each r.tags as t (t)}
                  <span class="np-result-tag">{t}</span>
                {/each}
              </div>
            {/if}
            <div class="np-result-slug">/{r.slug}</div>
          </button>
        </li>
      {/each}
      {#if query && results.length === 0}
        <li class="np-empty">No matches</li>
      {/if}
      {#if !query}
        <li class="np-hint">Start typing to search</li>
      {/if}
    </ul>

    <footer class="np-search-foot">
      <span class="np-kbd-group">
        <kbd>↑</kbd>
        <kbd>↓</kbd>
        <span>navigate</span>
      </span>
      <span class="np-kbd-group">
        <kbd>↵</kbd>
        <span>select</span>
      </span>
      <span class="np-kbd-group">
        <kbd>Esc</kbd>
        <span>close</span>
      </span>
    </footer>
  </div>
</div>

<style>
  .np-search-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 96px;
    z-index: 50;
  }
  .np-search-modal {
    width: min(640px, 92vw);
    background-color: var(--np-bg);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    box-shadow: var(--np-shadow-modal);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .np-search-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--np-divider);
    background-color: var(--np-bg);
  }
  .np-search-icon {
    font-size: 18px;
    color: var(--np-text-muted);
  }
  .np-search-input {
    flex: 1;
    border: 0;
    padding: 4px 0;
    font-size: 15px;
    background-color: transparent;
    color: var(--np-text-primary);
    outline: 0;
  }
  .np-search-input::placeholder { color: var(--np-text-muted); }
  .np-search-close {
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    padding: 2px 8px;
    color: var(--np-text-muted);
    font-size: 11px;
    cursor: pointer;
    font-family: var(--np-font-mono);
  }
  .np-search-close:hover { color: var(--np-text-primary); }
  .np-results {
    list-style: none;
    margin: 0;
    padding: 8px;
    max-height: 50vh;
    overflow-y: auto;
    background-color: var(--np-bg);
  }
  .np-results li {
    border-radius: var(--np-radius-md);
  }
  .np-results button {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 10px 12px;
    border-radius: var(--np-radius-md);
    cursor: pointer;
    color: var(--np-text-primary);
  }
  .np-results li.active button {
    background-color: var(--np-brand-soft);
  }
  .np-results li.active .np-result-title { color: var(--np-brand); }
  .np-result-title { font-weight: 500; }
  .np-result-slug {
    font-size: 12px;
    color: var(--np-text-muted);
    font-family: var(--np-font-mono);
    margin-top: 2px;
  }
  .np-result-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }
  .np-result-tag {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    color: var(--np-brand);
    background-color: color-mix(in srgb, var(--np-brand) 14%, transparent);
    padding: 1px 8px;
    border-radius: var(--np-radius-pill);
  }
  .np-empty, .np-hint {
    padding: 16px;
    color: var(--np-text-muted);
    text-align: center;
    font-size: 13px;
  }
  .np-search-foot {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 8px 16px;
    border-top: 1px solid var(--np-divider);
    background-color: var(--np-bg-surface);
    font-size: 12px;
    color: var(--np-text-muted);
  }
  .np-kbd-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .np-search-foot kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border: 1px solid var(--np-border);
    border-bottom-width: 2px;
    border-radius: var(--np-radius-sm);
    background-color: var(--np-bg);
    color: var(--np-text-secondary);
    font-family: var(--np-font-mono);
    font-size: 11px;
  }
</style>
