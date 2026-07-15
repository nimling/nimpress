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

  function goTo(slug: string, ev: MouseEvent) {
    if (typeof document === 'undefined') return
    const el = document.getElementById(slug)
    if (!el) return
    ev.preventDefault()
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.pushState(null, '', `#${slug}`)
    activeSlug = slug
  }
</script>

{#if headings.length > 0}
  <aside class="np-toc-wrap">
    <div class="np-toc">
      <div class="np-toc-label">On this page</div>
      <ul>
        {#each headings as h, i (h.slug || `h-${i}`)}
          <li class:lvl2={h.level === 2} class:lvl3={h.level === 3} class:lvl4={h.level >= 4}>
            <a href={`#${h.slug}`} class:active={activeSlug === h.slug} onclick={(e) => goTo(h.slug, e)}>{h.text}</a>
          </li>
        {/each}
      </ul>
    </div>
    <div class="np-toc-strip" aria-hidden="true">
      <span class="np-toc-strip-line"></span>
      <ul class="np-toc-strip-dots">
        {#each headings as h, i (h.slug || `h-${i}`)}
          <li class:lvl2={h.level === 2} class:lvl3={h.level === 3} class:lvl4={h.level >= 4}>
            <a href={`#${h.slug}`} class:active={activeSlug === h.slug} title={h.text} onclick={(e) => goTo(h.slug, e)}>
              <span class="np-toc-strip-dot"></span>
            </a>
          </li>
        {/each}
      </ul>
      <div class="np-toc-overlay">
        <div class="np-toc-label">On this page</div>
        <ul>
          {#each headings as h, i (h.slug || `oh-${i}`)}
            <li class:lvl2={h.level === 2} class:lvl3={h.level === 3} class:lvl4={h.level >= 4}>
              <a href={`#${h.slug}`} class:active={activeSlug === h.slug} onclick={(e) => goTo(h.slug, e)}>{h.text}</a>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </aside>
{/if}

<style>
  .np-toc-wrap {
    position: sticky;
    top: calc(var(--np-header-height) + 24px);
    font-size: 13px;
  }
  .np-toc {
    box-sizing: border-box;
    width: var(--np-toc-width);
    max-width: var(--np-toc-width);
  }
  .np-toc-label {
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--np-text-muted);
    font-weight: 600;
    margin-bottom: 8px;
  }
  .np-toc ul,
  .np-toc-overlay ul {
    list-style: none;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  .np-toc li,
  .np-toc-overlay li {
    margin: 4px 0;
    min-width: 0;
  }
  .np-toc li.lvl3 a,
  .np-toc-overlay li.lvl3 a { padding-left: 12px; }
  .np-toc li.lvl4 a,
  .np-toc-overlay li.lvl4 a { padding-left: 24px; }
  .np-toc a,
  .np-toc-overlay a {
    color: var(--np-text-secondary);
    text-decoration: none;
    display: block;
    padding: 2px 0;
    word-break: break-word;
    overflow-wrap: anywhere;
    hyphens: auto;
    line-height: 1.45;
  }
  .np-toc a:hover,
  .np-toc-overlay a:hover { color: var(--np-text-primary); }
  .np-toc a.active,
  .np-toc-overlay a.active { color: var(--np-brand); font-weight: 500; }

  .np-toc-strip { display: none; }
  .np-toc-strip-line { display: none; }
  .np-toc-strip-dots { list-style: none; margin: 0; padding: 0; }
  .np-toc-overlay { display: none; }

  @media (max-width: 1280px) {
    .np-toc { display: none; }
    .np-toc-strip {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      width: 10px;
      padding: 16px 0;
      box-sizing: border-box;
    }
    .np-toc-strip-line {
      display: block;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 0;
      border-left: 2px dotted var(--np-border);
      transform: translateX(-50%);
    }
    .np-toc-strip-dots {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
      position: relative;
      z-index: 1;
    }
    .np-toc-strip-dots li.lvl3 a { transform: translateX(0); }
    .np-toc-strip-dots a {
      display: inline-flex;
      width: 10px;
      height: 10px;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
    .np-toc-strip-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--np-text-faint);
      transition: background-color 0.18s ease, transform 0.18s ease;
    }
    .np-toc-strip-dots li.lvl3 .np-toc-strip-dot { width: 6px; height: 6px; }
    .np-toc-strip-dots li.lvl4 .np-toc-strip-dot { width: 5px; height: 5px; }
    .np-toc-strip-dots a:hover .np-toc-strip-dot {
      background-color: var(--np-text-primary);
      transform: scale(1.25);
    }
    .np-toc-strip-dots a.active .np-toc-strip-dot {
      background-color: var(--np-brand);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--np-brand) 20%, transparent);
      transform: scale(1.2);
    }
    .np-toc-overlay {
      display: block;
      position: absolute;
      top: 0;
      right: 20px;
      width: 240px;
      padding: 12px 14px;
      background-color: var(--np-bg-card);
      border: 1px solid var(--np-border);
      border-radius: var(--np-radius-md);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
      opacity: 0;
      transform: translateX(8px);
      pointer-events: none;
      transition: opacity 0.18s ease, transform 0.18s ease;
      z-index: 50;
    }
    .np-toc-strip:hover .np-toc-overlay,
    .np-toc-strip:focus-within .np-toc-overlay {
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
    }
  }

  @media (max-width: 1280px) {
    .np-toc-wrap {
      position: fixed;
      top: calc(var(--np-header-height) + 16px);
      right: 12px;
      z-index: 40;
    }
  }
  @media (max-width: 480px) {
    .np-toc-wrap { display: none; }
  }
</style>
