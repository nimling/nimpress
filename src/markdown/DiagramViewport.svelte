<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte'

  let {
    kind,
    svg = '',
    error = '',
    label = '',
    ratio = 0,
    children
  }: { kind: string; svg?: string; error?: string; label?: string; ratio?: number; children?: Snippet } = $props()

  let wrapper: HTMLDivElement
  let stage: HTMLDivElement
  let viewport: HTMLDivElement

  let scale = $state(1)
  let panX = $state(0)
  let panY = $state(0)
  let fullscreen = $state(false)
  let dragging = $state(false)
  let dragStartX = 0
  let dragStartY = 0
  let baseX = 0
  let baseY = 0

  const minScale = 0.2
  const maxScale = 6
  const scaleStep = 1.2

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) toggleFullscreen()
    }
    document.addEventListener('keydown', onKey)
    const onFsChange = () => {
      fullscreen = document.fullscreenElement === wrapper
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFsChange)
    }
  })

  $effect(() => {
    svg
    void tick().then(() => {
      const node = stage?.querySelector('svg')
      if (node) {
        node.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        node.style.display = 'block'
        node.style.maxWidth = '100%'
        node.style.maxHeight = '100%'
      }
      reset()
    })
  })

  function zoomIn() {
    scale = Math.min(maxScale, scale * scaleStep)
  }
  function zoomOut() {
    scale = Math.max(minScale, scale / scaleStep)
  }
  function reset() {
    scale = 1
    panX = 0
    panY = 0
  }
  async function toggleFullscreen() {
    if (!wrapper) return
    if (document.fullscreenElement === wrapper) {
      await document.exitFullscreen()
      fullscreen = false
    } else {
      await wrapper.requestFullscreen()
      fullscreen = true
    }
  }
  function onWheel(e: WheelEvent) {
    if (!viewport) return
    e.preventDefault()
    const direction = e.deltaY < 0 ? scaleStep : 1 / scaleStep
    const next = Math.min(maxScale, Math.max(minScale, scale * direction))
    const rect = viewport.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    const ratio = next / scale
    panX = cx - (cx - panX) * ratio
    panY = cy - (cy - panY) * ratio
    scale = next
  }
  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    dragging = true
    dragStartX = e.clientX
    dragStartY = e.clientY
    baseX = panX
    baseY = panY
    viewport.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return
    panX = baseX + (e.clientX - dragStartX)
    panY = baseY + (e.clientY - dragStartY)
  }
  function onPointerUp(e: PointerEvent) {
    if (!dragging) return
    dragging = false
    try { viewport.releasePointerCapture(e.pointerId) } catch {}
  }
</script>

<div
  class={['np-diagram-wrapper', `np-${kind}-wrapper`, fullscreen && ['np-diagram-fullscreen', `np-${kind}-fullscreen`]]}
  bind:this={wrapper}
>
  <div
    class={['np-diagram-viewport', `np-${kind}-viewport`, dragging && ['np-diagram-dragging', `np-${kind}-dragging`]]}
    class:np-diagram-fit={ratio > 0}
    style:aspect-ratio={ratio > 0 ? ratio : undefined}
    role={label ? 'img' : 'presentation'}
    aria-label={label || undefined}
    bind:this={viewport}
    onwheel={onWheel}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <div
      class="np-diagram-stage np-{kind}-stage"
      style:transform={`translate(${panX}px, ${panY}px) scale(${scale})`}
      bind:this={stage}
    >
      {#if error}
        <pre class="np-diagram-error">{error}</pre>
      {:else if children}
        {@render children()}
      {:else}
        {@html svg}
      {/if}
    </div>
  </div>
  <div class="np-diagram-toolbar np-{kind}-toolbar" aria-label="Diagram controls">
    <button type="button" onclick={zoomOut} aria-label="Zoom out" title="Zoom out">−</button>
    <button type="button" onclick={zoomIn} aria-label="Zoom in" title="Zoom in">+</button>
    <button type="button" onclick={reset} aria-label="Reset zoom" title="Reset">⟲</button>
    <button type="button" onclick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">
      {fullscreen ? '⤡' : '⛶'}
    </button>
  </div>
</div>

<style>
  .np-diagram-wrapper {
    position: relative;
    margin: 16px 0;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-surface);
    overflow: hidden;
  }
  .np-diagram-fullscreen {
    margin: 0;
    border: 0;
    border-radius: 0;
    background-color: var(--np-bg);
  }
  .np-diagram-viewport {
    position: relative;
    width: 100%;
    height: 420px;
    overflow: hidden;
    touch-action: none;
    cursor: grab;
    user-select: none;
  }
  .np-diagram-fit {
    height: auto;
    min-height: 12rem;
    max-height: 70vh;
  }
  .np-diagram-fullscreen .np-diagram-viewport {
    height: 100vh;
    max-height: none;
  }
  .np-diagram-dragging {
    cursor: grabbing;
  }
  .np-diagram-stage {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: center center;
    will-change: transform;
  }
  .np-diagram-stage :global(svg) {
    display: block;
    max-width: 100%;
    max-height: 100%;
  }
  .np-diagram-error {
    margin: 16px;
    white-space: pre-wrap;
    color: var(--np-text-secondary);
  }
  .np-diagram-toolbar {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    background-color: color-mix(in srgb, var(--np-bg-surface) 90%, transparent);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    padding: 4px;
    z-index: 2;
  }
  .np-diagram-toolbar button {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--np-text-secondary);
    border: 0;
    border-radius: var(--np-radius-sm);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0;
  }
  .np-diagram-toolbar button:hover {
    background-color: color-mix(in srgb, var(--np-brand) 14%, transparent);
    color: var(--np-brand);
  }
  .np-diagram-toolbar button:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 1px;
  }
</style>
