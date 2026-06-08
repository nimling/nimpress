<script lang="ts">
  let { html, lang, raw }: { html: string; lang: string; raw: string } = $props()
  let copied = $state(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(raw)
      copied = true
      setTimeout(() => (copied = false), 1500)
    } catch {}
  }
</script>

<div class="np-code">
  <div class="np-code-bar">
    <span class="np-code-lang">{lang || 'text'}</span>
    <button class="np-code-copy" onclick={copy}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  </div>
  <div class="np-code-body">
    {@html html}
  </div>
</div>

<style>
  .np-code {
    border-radius: var(--np-radius-md);
    overflow: hidden;
    background-color: var(--np-bg-code-block);
    margin: 16px 0;
    border: 1px solid var(--np-border);
  }
  .np-code-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background-color: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    height: 36px;
  }
  .np-code-lang {
    font-size: 12px;
    color: rgba(229, 231, 235, 0.6);
    font-family: var(--np-font-mono);
    text-transform: lowercase;
  }
  .np-code-copy {
    background: transparent;
    border: 0;
    color: rgba(229, 231, 235, 0.7);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--np-radius-sm);
  }
  .np-code-copy:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  .np-code-body :global(pre) {
    margin: 0;
    border-radius: 0;
    padding: 16px;
    background: transparent;
  }
</style>
