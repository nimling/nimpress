<script lang="ts">
  import type { PageModule } from '../types'
  import { configStore } from '../framework/configStore'
  import Page from './Page.svelte'

  let { page }: { page: PageModule } = $props()

  const terms = $derived($configStore.manifest?.glossary ?? [])
  const letters = $derived.by(() => {
    const first = new Map<string, string>()
    for (const entry of terms) {
      const letter = entry.term.charAt(0).toUpperCase()
      if (!first.has(letter)) first.set(letter, entry.slug)
    }
    return Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => ({ letter, slug: first.get(letter) }))
  })
  const showIndex = $derived(terms.length > 20)
</script>

<Page {page}>
  {#snippet lead()}
    {#if showIndex}
      <nav class="np-glossary-index" aria-label="Terms by letter">
        {#each letters as entry (entry.letter)}
          {#if entry.slug}
            <a class="np-glossary-letter" href={`#${entry.slug}`}>{entry.letter}</a>
          {:else}
            <span class="np-glossary-letter np-glossary-letter-empty">{entry.letter}</span>
          {/if}
        {/each}
      </nav>
    {/if}
  {/snippet}
</Page>

<style>
  .np-glossary-index {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-width: var(--np-content-max, 1024px);
    margin: 0 auto;
    padding: 96px 32px 0;
    box-sizing: border-box;
  }
  .np-glossary-index + :global(.np-prose) {
    padding-top: 0;
  }
  .np-glossary-letter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--np-radius-sm);
    font-size: 13px;
    font-weight: 600;
    color: var(--np-brand);
    text-decoration: none;
  }
  .np-glossary-letter:hover {
    background-color: var(--np-bg-surface);
  }
  .np-glossary-letter-empty {
    color: var(--np-text-faint);
    font-weight: 400;
  }
</style>
