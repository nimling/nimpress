<script lang="ts">
  import { onMount } from 'svelte'
  import { theme } from '../framework/stores/theme'

  let { source }: { source: string } = $props()

  let wrapper: HTMLDivElement
  let stage: HTMLDivElement
  let viewport: HTMLDivElement
  let svgId = `np-mermaid-${Math.floor(Math.random() * 1_000_000)}`

  let scale = $state(1)
  let panX = $state(0)
  let panY = $state(0)
  let fullscreen = $state(false)
  let dragging = false
  let dragStartX = 0
  let dragStartY = 0
  let baseX = 0
  let baseY = 0

  const minScale = 0.2
  const maxScale = 6
  const scaleStep = 1.2

  async function render() {
    if (!stage) return
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      theme: $theme === 'dark' ? 'dark' : 'default',
      fontFamily: 'var(--np-font-sans)',
      securityLevel: 'loose',
      logLevel: 'error',
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis', padding: 20, nodeSpacing: 50, rankSpacing: 50 },
      sequence: { useMaxWidth: true, actorMargin: 60, boxMargin: 15, boxTextMargin: 8, noteMargin: 15, messageMargin: 40, mirrorActors: true, diagramMarginX: 30, diagramMarginY: 30 },
      gantt: { useMaxWidth: true, fontSize: 12 }
    })
    try {
      const { svg } = await mermaid.render(svgId, source)
      stage.innerHTML = svg
      const node = stage.querySelector('svg')
      if (node) {
        node.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        node.style.display = 'block'
        node.style.maxWidth = '100%'
        node.style.maxHeight = '100%'
      }
      reset()
    } catch (err) {
      stage.innerHTML = `<pre>${err}</pre>`
    }
  }

  onMount(() => {
    void render()
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
    $theme
    void render()
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

<div class="np-mermaid-wrapper" class:np-mermaid-fullscreen={fullscreen} bind:this={wrapper}>
  <div
    class="np-mermaid-viewport"
    class:np-mermaid-dragging={dragging}
    bind:this={viewport}
    onwheel={onWheel}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <div
      class="np-mermaid-stage"
      style:transform={`translate(${panX}px, ${panY}px) scale(${scale})`}
      bind:this={stage}
    ></div>
  </div>
  <div class="np-mermaid-toolbar" aria-label="Diagram controls">
    <button type="button" onclick={zoomOut} aria-label="Zoom out" title="Zoom out">−</button>
    <button type="button" onclick={zoomIn} aria-label="Zoom in" title="Zoom in">+</button>
    <button type="button" onclick={reset} aria-label="Reset zoom" title="Reset">⟲</button>
    <button type="button" onclick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">
      {fullscreen ? '⤡' : '⛶'}
    </button>
  </div>
</div>

<style>
  .np-mermaid-wrapper {
    position: relative;
    margin: 16px 0;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-surface);
    overflow: hidden;
  }
  .np-mermaid-fullscreen {
    margin: 0;
    border: 0;
    border-radius: 0;
    background-color: var(--np-bg);
  }
  .np-mermaid-viewport {
    position: relative;
    width: 100%;
    height: 420px;
    overflow: hidden;
    touch-action: none;
    cursor: grab;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .np-mermaid-fullscreen .np-mermaid-viewport {
    height: 100vh;
  }
  .np-mermaid-dragging {
    cursor: grabbing;
  }
  .np-mermaid-stage {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    max-height: 100%;
    transform-origin: center center;
    will-change: transform;
  }
  .np-mermaid-stage :global(svg) {
    display: block;
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
  }
  .np-mermaid-toolbar {
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
  .np-mermaid-toolbar button {
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
  .np-mermaid-toolbar button:hover {
    background-color: color-mix(in srgb, var(--np-brand) 14%, transparent);
    color: var(--np-brand);
  }
  .np-mermaid-toolbar button:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 1px;
  }
</style>
