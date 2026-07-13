<script lang="ts">
  import { onMount } from 'svelte'

  let {
    orientation,
    at = '-5px',
    onmove,
    ondragchange
  }: {
    orientation: 'horizontal' | 'vertical'
    at?: string
    onmove: (e: PointerEvent) => void
    ondragchange?: (dragging: boolean) => void
  } = $props()

  function move(e: PointerEvent) {
    onmove(e)
  }

  function up() {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    document.body.style.removeProperty('user-select')
    document.body.style.removeProperty('cursor')
    ondragchange?.(false)
  }

  function down(e: PointerEvent) {
    e.preventDefault()
    document.body.style.setProperty('user-select', 'none')
    document.body.style.setProperty('cursor', orientation === 'horizontal' ? 'row-resize' : 'col-resize')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    ondragchange?.(true)
  }

  onMount(() => up)
</script>

<div
  class="np-drag-divider np-drag-divider-{orientation}"
  role="separator"
  aria-orientation={orientation}
  style="--np-drag-at: {at};"
  onpointerdown={down}
></div>

<style>
  .np-drag-divider {
    position: absolute;
    z-index: 2;
    touch-action: none;
  }

  .np-drag-divider-horizontal {
    top: var(--np-drag-at);
    left: 0;
    right: 0;
    height: 10px;
    cursor: row-resize;
  }

  .np-drag-divider-vertical {
    left: var(--np-drag-at);
    top: 0;
    bottom: 0;
    width: 10px;
    cursor: col-resize;
  }
</style>
