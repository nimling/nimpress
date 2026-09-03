<script lang="ts">
  import { onMount } from 'svelte'
  import { configStore, withBase } from '../framework/configStore'

  const announce = $derived($configStore.announce)
  const key = $derived(announce ? `np-announce-${hash(announce.text)}` : '')
  let dismissed = $state(false)
  let away = $state(false)

  function hash(text: string): string {
    let value = 5381
    for (let i = 0; i < text.length; i++) value = ((value << 5) + value + text.charCodeAt(i)) | 0
    return (value >>> 0).toString(36)
  }

  function href(link: string): string {
    return /^[a-z][a-z0-9+.-]*:/i.test(link) ? link : withBase(link)
  }

  function dismiss() {
    dismissed = true
    try {
      localStorage.setItem(key, 'true')
    } catch {}
  }

  $effect(() => {
    if (!key) return
    try {
      dismissed = localStorage.getItem(key) === 'true'
    } catch {
      dismissed = false
    }
  })

  onMount(() => {
    const headerHeight = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--np-header-height')
      const parsed = Number.parseFloat(raw)
      return Number.isFinite(parsed) ? parsed : 64
    }
    const onScroll = (event: Event) => {
      const target = event.target
      const scroller = target instanceof Document ? document.scrollingElement : (target as Element)
      if (!scroller?.classList?.contains('np-main') && !(target instanceof Document)) return
      away = (scroller?.scrollTop ?? 0) > headerHeight()
    }
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  })
</script>

{#if announce && !dismissed}
  <div class="np-announce" class:np-announce-away={away} role="status">
    {#if announce.link}
      <a class="np-announce-text" href={href(announce.link)}>{@html announce.html ?? announce.text}</a>
    {:else}
      <span class="np-announce-text">{@html announce.html ?? announce.text}</span>
    {/if}
    {#if announce.dismiss}
      <button type="button" class="np-announce-dismiss" aria-label="Dismiss announcement" onclick={dismiss}>×</button>
    {/if}
  </div>
{/if}

<style>
  .np-announce {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 12px;
    min-height: 36px;
    padding: 6px 20px;
    background-color: var(--np-announce-bg, var(--np-brand));
    color: var(--np-announce-text, #ffffff);
    font-size: 13px;
    line-height: 1.4;
    text-align: center;
    transition: opacity 0.2s ease;
  }
  .np-announce-away {
    display: none;
  }
  .np-announce-text {
    color: inherit;
    text-decoration: none;
    min-width: 0;
  }
  a.np-announce-text:hover {
    text-decoration: underline;
  }
  .np-announce-text :global(a) {
    color: inherit;
    text-decoration: underline;
  }
  .np-announce-text :global(code) {
    font-family: var(--np-font-mono);
    font-size: 12px;
    padding: 1px 5px;
    border-radius: var(--np-radius-sm);
    background-color: rgb(255 255 255 / 0.18);
  }
  .np-announce-dismiss {
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 18px;
    line-height: 1;
    padding: 2px 6px;
    cursor: pointer;
    border-radius: var(--np-radius-sm);
  }
  .np-announce-dismiss:hover {
    background-color: rgb(255 255 255 / 0.18);
  }
</style>
