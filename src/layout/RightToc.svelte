<script lang="ts">
  import { onMount } from 'svelte'
  import type { Heading } from '../types'

  let { headings = [] }: { headings: Heading[] } = $props()

  let activeSlug = $state<string>('')

  onMount(() => {
    if (typeof window === 'undefined') return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) activeSlug = e.target.id
        }
      },
      { rootMargin: '0px 0px -75% 0px', threshold: 0 }
    )
    for (const h of headings) {
      const el = document.getElementById(h.slug)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  })
</script>

{#if headings.length > 0}
  <aside class="np-toc">
    <div class="np-toc-label">On this page</div>
    <ul>
      {#each headings as h, i (h.slug || `h-${i}`)}
        <li class:lvl2={h.level === 2} class:lvl3={h.level === 3} class:lvl4={h.level >= 4}>
          <a href={`#${h.slug}`} class:active={activeSlug === h.slug}>{h.text}</a>
        </li>
      {/each}
    </ul>
  </aside>
{/if}

<style>
  .np-toc {
    position: sticky;
    top: calc(var(--np-header-height) + 24px);
    width: 100%;
    max-width: 100%;
    min-width: 0;
    font-size: 13px;
    padding-left: 16px;
    box-sizing: border-box;
    overflow-x: hidden;
  }
  .np-toc-label {
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--np-text-muted);
    font-weight: 600;
    margin-bottom: 8px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  li {
    margin: 4px 0;
    min-width: 0;
  }
  li.lvl3 a { padding-left: 12px; }
  li.lvl4 a { padding-left: 24px; }
  a {
    color: var(--np-text-secondary);
    text-decoration: none;
    display: block;
    padding: 2px 0;
    word-break: break-word;
    overflow-wrap: anywhere;
    hyphens: auto;
    line-height: 1.45;
  }
  a:hover { color: var(--np-text-primary); }
  a.active { color: var(--np-brand); font-weight: 500; }
  @media (max-width: 1280px) { .np-toc { display: none; } }
</style>
