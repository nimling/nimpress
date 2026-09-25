<script lang="ts">
  let { html, lang, raw }: { html: string; lang: string; raw: string } = $props()
  let copied = $state(false)
  let root: HTMLDivElement | undefined = $state()
  let tip = $state<{ number: number; top: number; left: number } | null>(null)

  const meta = $derived.by(() => {
    if (typeof DOMParser === 'undefined') return { title: '', tips: {} as Record<string, string> }
    const pre = new DOMParser().parseFromString(html, 'text/html').querySelector('pre')
    let tips: Record<string, string> = {}
    try {
      tips = JSON.parse(decodeURIComponent(escape(atob(pre?.dataset.annotations ?? '')))) ?? {}
    } catch {}
    return { title: pre?.dataset.title ?? '', tips }
  })
  const tipHtml = $derived(tip ? meta.tips[String(tip.number)] ?? '' : '')

  async function copy() {
    try {
      await navigator.clipboard.writeText(raw)
      copied = true
      setTimeout(() => (copied = false), 1500)
    } catch {}
  }

  function openTip(marker: HTMLElement) {
    if (!root) return
    const number = Number(marker.dataset.annotation)
    if (tip?.number === number) {
      tip = null
      return
    }
    const bounds = root.getBoundingClientRect()
    const rect = marker.getBoundingClientRect()
    const width = Math.min(360, bounds.width - 16)
    const left = Math.max(8, Math.min(rect.left - bounds.left, bounds.width - width - 8))
    tip = { number, top: rect.bottom - bounds.top + 6, left }
  }

  function onBodyClick(event: MouseEvent) {
    const marker = (event.target as HTMLElement).closest<HTMLElement>('.np-code-annotation')
    if (marker) openTip(marker)
  }

  function onBodyKey(event: KeyboardEvent) {
    const marker = (event.target as HTMLElement).closest<HTMLElement>('.np-code-annotation')
    if (marker && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      openTip(marker)
    }
    if (event.key === 'Escape') tip = null
  }

  function onDocumentClick(event: MouseEvent) {
    if (tip && root && !root.contains(event.target as Node)) tip = null
  }
</script>

<svelte:document onclick={onDocumentClick} />

<div class="np-code" bind:this={root}>
  <div class="np-code-bar">
    {#if meta.title}
      <span class="np-code-title">{meta.title}</span>
    {:else}
      <span class="np-code-lang">{lang || 'text'}</span>
    {/if}
    <span class="np-code-tools">
      {#if meta.title}
        <span class="np-code-lang np-code-lang-tag">{lang || 'text'}</span>
      {/if}
      <button class="np-code-copy" onclick={copy}>
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </span>
  </div>
  <div class="np-code-body" onclick={onBodyClick} onkeydown={onBodyKey} role="presentation">
    {@html html}
  </div>
  {#if tip && tipHtml}
    <div class="np-code-annotation-tip" style="top: {tip.top}px; left: {tip.left}px;" role="dialog">
      {@html tipHtml}
    </div>
  {/if}
</div>

<style>
  .np-code {
    position: relative;
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-code-block);
    margin: 16px 0;
    border: 1px solid var(--np-border);
  }
  .np-code-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--np-code-bar-bg);
    border-bottom: 1px solid var(--np-code-bar-border);
    border-radius: var(--np-radius-md) var(--np-radius-md) 0 0;
    height: 36px;
  }
  .np-code-lang {
    font-size: 12px;
    color: var(--np-code-bar-text);
    font-family: var(--np-font-mono);
    text-transform: lowercase;
  }
  .np-code-title {
    font-size: 12px;
    color: var(--np-code-bar-text-active);
    font-family: var(--np-font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .np-code-tools {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .np-code-lang-tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-code-bar-border-strong);
  }
  .np-code-copy {
    background: transparent;
    border: 0;
    color: var(--np-code-bar-text);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--np-radius-sm);
  }
  .np-code-copy:hover {
    background-color: var(--np-code-bar-hover);
    color: var(--np-code-bar-text-active);
  }
  .np-code-body {
    overflow: hidden;
    border-radius: 0 0 var(--np-radius-md) var(--np-radius-md);
  }
  .np-code-body :global(pre) {
    margin: 0;
    border-radius: 0;
    padding: 0;
    background: transparent;
    overflow-x: auto;
  }
  .np-code-body :global(pre code) {
    display: block;
    padding: 16px 0;
    font-family: var(--np-font-mono);
    font-size: 12.5px;
    line-height: 1.65;
  }
  .np-code-body :global(pre code .line) {
    display: inline-block;
    box-sizing: border-box;
    min-width: 100%;
    padding: 0 20px;
  }
  .np-code-body :global(pre code .np-code-line-highlight) {
    background-color: var(--np-code-line-highlight);
    box-shadow: inset 3px 0 0 var(--np-brand);
  }
  .np-code-body :global(pre[data-lines] code .line::before) {
    counter-increment: np-line;
    content: counter(np-line);
    display: inline-block;
    min-width: 3ch;
    margin-right: 16px;
    text-align: right;
    color: var(--np-code-gutter);
    user-select: none;
  }
  .np-code-body :global(.np-code-annotation) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: text-bottom;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    margin: 0 2px;
    border-radius: var(--np-radius-pill);
    background-color: var(--np-code-annotation);
    color: var(--np-code-annotation-text);
    font-family: var(--np-font-sans);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    user-select: none;
  }
  .np-code-body :global(.np-code-annotation::before) {
    content: attr(data-annotation);
  }
  .np-code-body :global(.np-code-annotation:hover),
  .np-code-body :global(.np-code-annotation:focus-visible) {
    outline: 2px solid var(--np-code-annotation);
    outline-offset: 2px;
  }
  .np-code-annotation-tip {
    position: absolute;
    z-index: 5;
    width: min(360px, calc(100% - 16px));
    padding: 10px 12px;
    border-radius: var(--np-radius-md);
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-card);
    color: var(--np-text-primary);
    box-shadow: var(--np-shadow-modal);
    font-family: var(--np-font-sans);
    font-size: 13px;
    line-height: 1.5;
  }
  .np-code-annotation-tip :global(p) {
    margin: 0 0 8px;
  }
  .np-code-annotation-tip :global(p:last-child) {
    margin-bottom: 0;
  }
  .np-code-annotation-tip :global(code) {
    font-family: var(--np-font-mono);
    font-size: 12px;
    padding: 1px 4px;
    border-radius: var(--np-radius-sm);
    background-color: var(--np-bg-code-inline);
  }
  .np-code-annotation-tip :global(a) {
    color: var(--np-link);
  }
</style>
