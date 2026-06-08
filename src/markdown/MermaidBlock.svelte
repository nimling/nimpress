<script lang="ts">
  import { onMount } from 'svelte'
  import { theme } from '../framework/stores/theme'

  let { source }: { source: string } = $props()

  let container: HTMLDivElement
  let svgId = `np-mermaid-${Math.floor(Math.random() * 1_000_000)}`

  async function render() {
    if (!container) return
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      theme: $theme === 'dark' ? 'dark' : 'default',
      fontFamily: 'var(--np-font-sans)'
    })
    try {
      const { svg } = await mermaid.render(svgId, source)
      container.innerHTML = svg
    } catch (err) {
      container.innerHTML = `<pre>${err}</pre>`
    }
  }

  onMount(render)

  $effect(() => {
    $theme
    void render()
  })
</script>

<div class="np-mermaid-host" bind:this={container}></div>

<style>
  .np-mermaid-host {
    display: flex;
    justify-content: center;
    margin: 16px 0;
    padding: 16px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-surface);
  }
</style>
