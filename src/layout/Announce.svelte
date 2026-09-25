<script lang="ts">
  import { configStore, withBase } from '../framework/configStore'

  const announce = $derived($configStore.announce)
  const key = $derived(announce ? `np-announce-${hash(announce.text)}` : '')
  let dismissed = $state(true)

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
</script>

{#if announce && !dismissed}
  <div class="np-announce" role="status">
    <span class="np-announce-mark" aria-hidden="true"></span>
    {#if announce.link}
      <a class="np-announce-text" href={href(announce.link)}>{@html announce.html ?? announce.text}</a>
    {:else}
      <span class="np-announce-text">{@html announce.html ?? announce.text}</span>
    {/if}
    {#if announce.dismiss}
      <button type="button" class="np-announce-dismiss" aria-label="Dismiss announcement" onclick={dismiss}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>
{/if}

<style>
  .np-announce {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 30;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    column-gap: 12px;
    width: calc(100vw - 32px);
    max-width: 24rem;
    box-sizing: border-box;
    padding: 14px 12px 14px 16px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    background-color: var(--np-announce-bg, var(--np-bg-card));
    color: var(--np-announce-text, var(--np-text-primary));
    box-shadow: var(--np-shadow-popover);
    font-size: 14px;
    line-height: 1.45;
    animation: np-announce-in 420ms cubic-bezier(0.16, 1, 0.3, 1) 600ms both;
  }
  .np-announce-mark {
    width: 8px;
    height: 8px;
    margin-top: 6px;
    border-radius: var(--np-radius-pill);
    background-color: var(--np-brand);
    box-shadow: 0 0 0 4px var(--np-brand-soft);
  }
  .np-announce-text {
    color: inherit;
    text-decoration: none;
    min-width: 0;
  }
  a.np-announce-text:hover {
    text-decoration: underline;
    text-underline-offset: 0.2em;
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
    background-color: var(--np-bg-code-inline);
  }
  .np-announce-dismiss {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin: -4px 0;
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--np-text-muted);
    cursor: pointer;
    border-radius: var(--np-radius-sm);
  }
  .np-announce-dismiss:hover {
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
  }
  @keyframes np-announce-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }
  @media (max-width: 640px) {
    .np-announce {
      right: 16px;
      bottom: 16px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .np-announce {
      animation: none;
    }
  }
</style>
