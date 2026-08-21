<script lang="ts">
  import { onMount } from 'svelte'
  import { navigate } from 'sly-svelte-location-router'
  import { theme } from '../framework/stores/theme'
  import { withBase } from '../framework/configStore'
  import FullscreenIcon from '../icons/FullscreenIcon.svelte'
  import type { ErdDiagram } from '../dbml/erd'
  import '@xyflow/svelte/dist/style.css'

  let {
    schema,
    error = '',
    height = '520px',
    activateOnMount = false,
    flush = false
  }: {
    schema: string
    error?: string
    height?: string
    activateOnMount?: boolean
    flush?: boolean
  } = $props()

  let wrapper: HTMLDivElement
  let fullscreen = $state(false)
  let activated = $state(false)
  let buildFailure = $state('')
  let flow = $state<Record<string, any> | null>(null)
  let nodeTypes = $state.raw<Record<string, any>>({})
  let nodes = $state.raw<any[]>([])
  let edges = $state.raw<any[]>([])
  let viewport = $state.raw<{ x: number; y: number; zoom: number } | undefined>(undefined)
  let tableCount = $state(0)

  const active = $derived(activateOnMount || activated)
  const failure = $derived(error || buildFailure)
  const colorMode = $derived($theme === 'dark' ? 'dark' : 'light')
  const Flow = $derived(flow?.SvelteFlow)
  const Background = $derived(flow?.Background)
  const Controls = $derived(flow?.Controls)
  const MiniMap = $derived(flow?.MiniMap)

  async function build() {
    if (error || flow) return
    try {
      const diagram = JSON.parse(schema) as ErdDiagram
      const [module, table, note] = await Promise.all([
        import('@xyflow/svelte'),
        import('./DbmlTable.svelte'),
        import('./DbmlNote.svelte')
      ])
      nodeTypes = { table: table.default, note: note.default }
      tableCount = diagram.tables.length
      nodes = [
        ...diagram.tables.map((entry) => ({
          id: entry.id,
          type: 'table',
          position: { x: entry.x, y: entry.y },
          width: entry.width,
          data: entry
        })),
        ...diagram.notes.map((entry) => ({
          id: entry.id,
          type: 'note',
          position: { x: entry.x, y: entry.y },
          width: entry.width,
          data: entry
        }))
      ]
      edges = diagram.edges.map((entry) => ({
        id: entry.id,
        source: entry.source,
        target: entry.target,
        sourceHandle: entry.sourceHandle,
        targetHandle: entry.targetHandle,
        type: 'default',
        markerEnd: entry.many
          ? { type: module.MarkerType.ArrowClosed, width: 14, height: 14 }
          : undefined
      }))
      flow = module
    } catch (err) {
      buildFailure = String(err)
    }
  }

  export async function toggleFullscreen() {
    if (!wrapper) return
    if (document.fullscreenElement === wrapper) {
      await document.exitFullscreen()
      fullscreen = false
    } else {
      await wrapper.requestFullscreen()
      fullscreen = true
    }
  }

  function focusTable(id: string) {
    const node = nodes.find((entry) => entry.id === id)
    if (!node || !wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const zoom = Math.min(1.1, Math.max(0.7, viewport?.zoom ?? 1))
    const width = Number(node.width ?? node.data?.width ?? 240)
    const nodeHeight = Number(node.data?.height ?? 200)
    viewport = {
      x: rect.width / 2 - (node.position.x + width / 2) * zoom,
      y: rect.height / 2 - (node.position.y + nodeHeight / 2) * zoom,
      zoom
    }
    nodes = nodes.map((entry) => ({ ...entry, selected: entry.id === id }))
  }

  async function openLink(href: string) {
    if (/^[a-z]+:\/\//i.test(href) || href.startsWith('//')) {
      window.open(href, '_blank', 'noopener')
      return
    }
    if (fullscreen) await toggleFullscreen()
    if (href.startsWith('#')) {
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    navigate(withBase(href))
  }

  onMount(() => {
    void build()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) void toggleFullscreen()
    }
    const onFsChange = () => {
      fullscreen = document.fullscreenElement === wrapper
    }
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ link?: string; target?: string }>).detail
      if (detail?.target) {
        focusTable(detail.target)
        return
      }
      if (detail?.link) void openLink(detail.link)
    }
    wrapper?.addEventListener('np-erd-open', onOpen)
    document.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => {
      wrapper?.removeEventListener('np-erd-open', onOpen)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFsChange)
    }
  })
</script>

<div
  class="np-dbml-wrapper"
  class:np-dbml-fullscreen={fullscreen}
  class:np-dbml-flush={flush}
  style:--np-dbml-height={height}
  bind:this={wrapper}
>
  {#if failure}
    <pre class="np-dbml-error">{failure}</pre>
  {:else}
    <div class="np-dbml-host">
      {#if Flow}
        <Flow
          bind:nodes
          bind:edges
          bind:viewport
          {nodeTypes}
          {colorMode}
          fitView
          fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
          minZoom={0.12}
          maxZoom={2}
          nodesConnectable={false}
          edgesFocusable={false}
          zoomOnScroll={active}
          preventScrolling={active}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={22} size={1} />
          <Controls showLock={false} position="top-left" />
          {#if tableCount > 3}
            <MiniMap pannable zoomable position="bottom-right" width={150} height={92} />
          {/if}
        </Flow>
      {/if}
    </div>
    {#if active}
      <p class="np-dbml-hint">drag to pan · drag a table to move it · scroll to zoom</p>
    {:else}
      <button class="np-dbml-shield" type="button" onclick={() => (activated = true)}>
        <span class="np-dbml-shield-label">click to explore the schema</span>
      </button>
    {/if}
    <div class="np-dbml-toolbar" aria-label="Diagram controls">
      <button type="button" onclick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">
        <FullscreenIcon />
      </button>
    </div>
  {/if}
</div>

<style>
  .np-dbml-wrapper {
    position: relative;
    margin: 16px 0;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg);
    overflow: hidden;
    height: var(--np-dbml-height, 520px);
  }
  .np-dbml-fullscreen {
    margin: 0;
    border: 0;
    border-radius: 0;
    height: 100vh;
  }
  .np-dbml-flush {
    margin: 0;
    border: 0;
    border-radius: 0;
  }
  .np-dbml-host {
    position: absolute;
    inset: 0;
  }
  .np-dbml-host :global(.svelte-flow) {
    --xy-background-color: var(--np-bg);
    --xy-background-pattern-color: var(--np-divider);
    --xy-edge-stroke: var(--np-border-strong);
    --xy-edge-stroke-selected: var(--np-brand);
    --xy-edge-stroke-width: 1.5;
    --xy-controls-button-background-color: var(--np-bg-surface);
    --xy-controls-button-background-color-hover: var(--np-table-row-hover);
    --xy-controls-button-color: var(--np-text-secondary);
    --xy-controls-button-color-hover: var(--np-brand);
    --xy-controls-button-border-color: var(--np-border);
    --xy-minimap-background-color: var(--np-bg-surface);
    --xy-minimap-mask-background-color: color-mix(in srgb, var(--np-bg) 62%, transparent);
    --xy-minimap-node-background-color: var(--np-border-strong);
    background-color: var(--np-bg);
  }
  .np-dbml-host :global(.svelte-flow__node) {
    font-family: var(--np-font-sans);
  }
  .np-dbml-host :global(.svelte-flow__node.selected .np-erd-table) {
    border-color: var(--np-brand);
    box-shadow: 0 0 0 2px var(--np-brand-soft);
  }
  .np-dbml-host :global(.svelte-flow__edge-path) {
    stroke: var(--np-border-strong);
  }
  .np-dbml-host :global(.svelte-flow__edge.selected .svelte-flow__edge-path),
  .np-dbml-host :global(.svelte-flow__edge:hover .svelte-flow__edge-path) {
    stroke: var(--np-brand);
    stroke-width: 2;
  }
  .np-dbml-host :global(.svelte-flow__arrowhead polyline) {
    stroke: var(--np-border-strong);
    fill: var(--np-border-strong);
  }
  .np-dbml-host :global(.svelte-flow__controls),
  .np-dbml-host :global(.svelte-flow__minimap) {
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    box-shadow: var(--np-shadow-card);
    overflow: hidden;
  }
  .np-dbml-error {
    margin: 0;
    padding: 16px;
    background-color: transparent;
    font-family: var(--np-font-mono);
    font-size: 12px;
    line-height: 1.6;
    color: var(--np-danger);
    white-space: pre-wrap;
    overflow: auto;
    height: 100%;
    box-sizing: border-box;
  }
  .np-dbml-shield {
    position: absolute;
    inset: 0;
    z-index: 6;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0 0 20px;
    border: 0;
    background-color: color-mix(in srgb, var(--np-bg) 30%, transparent);
    cursor: pointer;
    font: inherit;
  }
  .np-dbml-shield:hover {
    background-color: color-mix(in srgb, var(--np-bg) 12%, transparent);
  }
  .np-dbml-shield-label {
    padding: 6px 14px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-pill);
    background-color: var(--np-bg-surface);
    color: var(--np-text-secondary);
    font-size: 12px;
    letter-spacing: 0.02em;
    box-shadow: var(--np-shadow-card);
  }
  .np-dbml-shield:hover .np-dbml-shield-label {
    color: var(--np-brand);
    border-color: var(--np-brand);
  }
  .np-dbml-shield:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: -2px;
  }
  .np-dbml-hint {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    z-index: 5;
    padding: 3px 8px;
    border-radius: var(--np-radius-sm);
    background-color: color-mix(in srgb, var(--np-bg-surface) 88%, transparent);
    color: var(--np-text-faint);
    font-size: 11px;
    letter-spacing: 0.02em;
    pointer-events: none;
  }
  .np-dbml-toolbar {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    background-color: color-mix(in srgb, var(--np-bg-surface) 90%, transparent);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    padding: 4px;
    z-index: 5;
  }
  .np-dbml-toolbar button {
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
  .np-dbml-toolbar button:hover {
    background-color: color-mix(in srgb, var(--np-brand) 14%, transparent);
    color: var(--np-brand);
  }
  .np-dbml-toolbar button:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 1px;
  }
</style>
