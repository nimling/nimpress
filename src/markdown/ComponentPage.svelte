<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { ComponentStory, PageModule } from '../types'
  import { theme } from '../framework/stores/theme'
  import CodeEditor from './CodeEditor.svelte'
  import ControlNode, { mockValue } from './ControlNode.svelte'

  let { page }: { page: PageModule } = $props()

  const data = $derived(page.componentData)
  const schema = $derived(page.componentData?.schema)
  const stories = $derived(page.componentData?.stories ?? [])
  const emits = $derived(page.componentData?.schema?.emits ?? [])

  let view = $state('overview')
  let propValues = $state<Record<string, unknown>>({})
  let slotValues = $state<Record<string, string>>({})
  let emitLog = $state<Array<{ name: string; args: unknown[]; at: string }>>([])
  let subscribedEmits = $state<string[]>([])
  let emitFilter = $state('')
  let ready = $state(false)
  let claudeDraft = $state('')
  let claudeSaved = $state(true)
  let claudeSaving = $state(false)
  let iframeEl: HTMLIFrameElement | undefined = $state()
  let wsEl: HTMLDivElement | undefined = $state()

  let dock = $state<'bottom' | 'right'>('bottom')
  let dragging = $state(false)
  let propsSize = $state(300)
  let zoom = $state(1)
  let vision = $state('none')
  let frameTheme = $state<'light' | 'dark'>('light')

  const visionFilters: Record<string, string> = {
    none: 'none',
    grayscale: 'grayscale(1)',
    invert: 'invert(1)',
    blur: 'blur(2px)',
    'low contrast': 'contrast(0.55)'
  }

  const activeStory = $derived(
    view === 'overview' ? null : stories.find((s) => storyAnchor(s.name) === view) ?? null
  )

  const emitCounts = $derived.by(() => {
    const counts: Record<string, number> = {}
    for (const entry of emitLog) counts[entry.name] = (counts[entry.name] ?? 0) + 1
    return counts
  })

  const filteredEmitLog = $derived.by(() => {
    const q = emitFilter.trim().toLowerCase()
    if (!q) return emitLog
    return emitLog.filter(
      (entry) => entry.name.toLowerCase().includes(q) || JSON.stringify(entry.args).toLowerCase().includes(q)
    )
  })

  function toggleEmit(name: string) {
    subscribedEmits = subscribedEmits.includes(name)
      ? subscribedEmits.filter((n) => n !== name)
      : [...subscribedEmits, name]
    push()
  }

  function storyAnchor(name: string): string {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function viewFromHash(): string {
    const h = window.location.hash
    if (h.startsWith('#story-')) {
      const anchor = h.slice('#story-'.length)
      if (stories.some((s) => storyAnchor(s.name) === anchor)) return anchor
    }
    return 'overview'
  }

  function encodeParam(value: unknown): string {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value))))
  }

  function defaultValues(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const spec of schema?.props ?? []) {
      if (spec.default !== undefined) out[spec.name] = spec.default
    }
    return out
  }

  function seedControls(story: ComponentStory | null) {
    propValues = { ...defaultValues(), ...(story?.props ?? {}) }
    slotValues = { ...(story?.slots ?? {}) }
    subscribedEmits = [...(schema?.emits ?? [])]
    emitFilter = ''
  }

  const storySrc = $derived.by(() => {
    if (!data || !activeStory) return ''
    const params = new URLSearchParams()
    params.set('story', activeStory.file.replace(/\.story\.ts$/, ''))
    params.set('props', encodeParam({ ...defaultValues(), ...(activeStory.props ?? {}) }))
    params.set('slots', encodeParam({ ...(activeStory.slots ?? {}) }))
    params.set('emits', encodeParam(schema?.emits ?? []))
    params.set('theme', untrack(() => frameTheme))
    return `${data.harnessPath}?${params.toString()}`
  })

  function push() {
    if (!ready || !iframeEl?.contentWindow) return
    iframeEl.contentWindow.postMessage(
      {
        type: 'nimpress:props',
        props: $state.snapshot(propValues),
        slots: $state.snapshot(slotValues),
        emits: $state.snapshot(subscribedEmits),
        theme: frameTheme
      },
      '*'
    )
  }

  function toggleFrameTheme() {
    frameTheme = frameTheme === 'dark' ? 'light' : 'dark'
    push()
  }

  function setProp(name: string, value: unknown) {
    const next = { ...propValues }
    if (value === undefined) delete next[name]
    else next[name] = value
    propValues = next
    push()
  }

  function setSlot(name: string, value: string) {
    if (value === '') {
      const next = { ...slotValues }
      delete next[name]
      slotValues = next
    } else {
      slotValues = { ...slotValues, [name]: value }
    }
    push()
  }

  function fillMock() {
    const next = { ...propValues }
    for (const spec of schema?.props ?? []) {
      if (next[spec.name] !== undefined) continue
      const value = mockValue(spec)
      if (value !== undefined) next[spec.name] = value
    }
    propValues = next
    const nextSlots = { ...slotValues }
    for (const spec of schema?.slots ?? []) {
      if (nextSlots[spec.name] === undefined) nextSlots[spec.name] = `Sample ${spec.name}`
    }
    slotValues = nextSlots
    push()
  }

  function dragMove(e: PointerEvent) {
    if (!wsEl) return
    const rect = wsEl.getBoundingClientRect()
    if (dock === 'bottom') {
      propsSize = Math.min(Math.max(rect.bottom - e.clientY, 140), rect.height * 0.7)
    } else {
      propsSize = Math.min(Math.max(rect.right - e.clientX, 240), rect.width * 0.7)
    }
  }

  function dragUp() {
    dragging = false
    window.removeEventListener('pointermove', dragMove)
    window.removeEventListener('pointerup', dragUp)
    window.removeEventListener('pointercancel', dragUp)
    document.body.style.removeProperty('user-select')
    document.body.style.removeProperty('cursor')
  }

  function dragDown(e: PointerEvent) {
    e.preventDefault()
    dragging = true
    document.body.style.setProperty('user-select', 'none')
    document.body.style.setProperty('cursor', dock === 'bottom' ? 'row-resize' : 'col-resize')
    window.addEventListener('pointermove', dragMove)
    window.addEventListener('pointerup', dragUp)
    window.addEventListener('pointercancel', dragUp)
  }

  function toggleDock() {
    dock = dock === 'bottom' ? 'right' : 'bottom'
    propsSize = dock === 'bottom' ? 300 : 340
  }

  function reloadFrame() {
    if (iframeEl) {
      ready = false
      iframeEl.src = storySrc
    }
  }

  async function saveClaude() {
    if (!data?.claudeMdPath) return
    claudeSaving = true
    try {
      const res = await fetch('/__nimpress/claude-md', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: data.claudeMdPath, content: claudeDraft })
      })
      claudeSaved = res.ok
    } catch {
      claudeSaved = false
    } finally {
      claudeSaving = false
    }
  }

  onMount(() => {
    claudeDraft = data?.claudeMd ?? ''
    frameTheme = $theme === 'dark' ? 'dark' : 'light'
    view = viewFromHash()
    if (view !== 'overview') seedControls(activeStory)
    const onMessage = (event: MessageEvent) => {
      const d = event.data
      if (!d || typeof d !== 'object') return
      if (d.type === 'nimpress:ready') {
        ready = true
        push()
        return
      }
      if (d.type === 'nimpress:emit') {
        const at = new Date().toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0')
        emitLog = [{ name: String(d.name), args: (d.args ?? []) as unknown[], at }, ...emitLog].slice(0, 200)
        return
      }
      if (d.type === 'nimpress:zoom') {
        zoom = Math.min(3, Math.max(0.25, Math.round(zoom * (1 - Number(d.delta) * 0.002) * 100) / 100))
        return
      }
      if (d.type === 'nimpress:zoomscale') {
        zoom = Math.min(3, Math.max(0.25, Math.round(zoom * Number(d.scale) * 100) / 100))
      }
    }
    const onHashChange = () => {
      const next = viewFromHash()
      if (next === view) return
      ready = false
      view = next
      emitLog = []
      if (next !== 'overview') seedControls(stories.find((s) => storyAnchor(s.name) === next) ?? null)
    }
    window.addEventListener('message', onMessage)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('hashchange', onHashChange)
      dragUp()
    }
  })
</script>

{#if view === 'overview'}
  <div class="np-page-backdrop np-page-backdrop-doc" aria-hidden="true"></div>
  <div class="np-page-shell">
    <div class="np-page">
      <header class="np-component-head">
        <div class="np-component-badges">
          <span class="np-component-system">{data?.system}</span>
          {#if data?.component && data.component !== page.frontmatter.title}
            <span class="np-component-package">{data.component}</span>
          {/if}
          {#if data?.package}
            <span class="np-component-package">{data.package}{data.version ? `@${data.version}` : ''}</span>
          {/if}
        </div>
        <h1 class="np-component-title">{page.frontmatter.title}</h1>
        {#if page.frontmatter.description}
          <p class="np-component-desc">{page.frontmatter.description}</p>
        {/if}
      </header>

      <article class="np-prose">
        {@html page.html}
      </article>

      {#if data?.claudeMdPath !== undefined || data?.claudeMd !== undefined}
        <section class="np-component-claude">
          <div class="np-component-claude-head">
            <h2>
              CLAUDE.md
              {#if data.claudeMdPath}<code class="np-component-claude-path">{data.claudeMdPath}</code>{/if}
              {#if data.claudeMd === undefined}<span class="np-component-claude-missing">missing</span>{/if}
            </h2>
            {#if data.editable}
              <button
                type="button"
                class="np-component-claude-save"
                disabled={claudeSaving}
                onclick={saveClaude}
              >{claudeSaving ? 'saving' : claudeSaved ? 'save' : 'retry save'}</button>
            {/if}
          </div>
          <CodeEditor bind:value={claudeDraft} language="markdown" readonly={!data.editable} fitContent maxHeight={480} />
        </section>
      {/if}

      <div class="np-page-tail"></div>
    </div>
  </div>
{:else if data && activeStory}
  <div
    bind:this={wsEl}
    class="np-ws"
    class:np-ws-dock-right={dock === 'right'}
    class:np-ws-dragging={dragging}
    style="--np-ws-props: {propsSize}px; --np-ws-zoom: {zoom}; --np-ws-filter: {visionFilters[vision]};"
  >
    <div class="np-ws-toolbar">
      <span class="np-ws-crumb">
        <a href={page.path}>{page.frontmatter.title}</a>
        <span class="np-ws-crumb-sep">/</span>
        <strong>{activeStory.name}</strong>
        {#if activeStory.description}
          <span class="np-ws-crumb-desc">{activeStory.description}</span>
        {/if}
      </span>
      <span class="np-ws-tools">
        <button type="button" class="np-ws-tool" title="toggle the component theme inside the frame" onclick={toggleFrameTheme}>{frameTheme === 'dark' ? 'light' : 'dark'}</button>
        <span class="np-ws-tool-group">
          <button type="button" class="np-ws-tool" title="zoom out" onclick={() => (zoom = Math.max(0.25, Math.round((zoom - 0.25) * 100) / 100))}>-</button>
          <button type="button" class="np-ws-tool" title="reset zoom" onclick={() => (zoom = 1)}>{Math.round(zoom * 100)}%</button>
          <button type="button" class="np-ws-tool" title="zoom in" onclick={() => (zoom = Math.min(3, Math.round((zoom + 0.25) * 100) / 100))}>+</button>
        </span>
        <select class="np-ws-tool np-ws-vision" bind:value={vision} title="vision simulation">
          {#each Object.keys(visionFilters) as name (name)}
            <option value={name}>{name}</option>
          {/each}
        </select>
        <button type="button" class="np-ws-tool" title="dock props" onclick={toggleDock}>{dock === 'bottom' ? 'dock right' : 'dock bottom'}</button>
        <button type="button" class="np-ws-tool" title="reload" onclick={reloadFrame}>reload</button>
        <a class="np-ws-tool" href={storySrc} target="_blank" rel="noreferrer" title="open harness directly">open</a>
      </span>
    </div>

    <div
      class="np-ws-stage"
      onwheel={(e) => {
        if (!e.ctrlKey) return
        e.preventDefault()
        zoom = Math.min(3, Math.max(0.25, Math.round(zoom * (1 - e.deltaY * 0.002) * 100) / 100))
      }}
    >
      <div class="np-ws-frame-wrap">
        <iframe bind:this={iframeEl} class="np-ws-frame" src={storySrc} title={data.component}></iframe>
      </div>
    </div>

    <div
      class="np-ws-divider"
      class:np-ws-divider-dragging={dragging}
      role="separator"
      aria-orientation={dock === 'bottom' ? 'horizontal' : 'vertical'}
      onpointerdown={dragDown}
    ></div>

    <div class="np-ws-props">
      <div class="np-ws-props-head">
        <span class="np-ws-props-title">props</span>
        <button
          type="button"
          class="np-ws-tool"
          title="fill every empty control with a sample value"
          onclick={fillMock}
        >mock</button>
      </div>
      {#if schema && (schema.props.length || schema.slots.length)}
        {#key activeStory.name}
          <div class="np-ws-controls">
            {#each schema.props as spec (spec.name)}
              <ControlNode {spec} value={propValues[spec.name]} onchange={(v) => setProp(spec.name, v)} />
            {/each}
            {#each schema.slots as spec (spec.name)}
              <ControlNode
                spec={{ ...spec, kind: 'slot', type: 'slot' }}
                value={slotValues[spec.name]}
                onchange={(v) => setSlot(spec.name, typeof v === 'string' ? v : '')}
              />
            {/each}
          </div>
        {/key}
      {:else}
        <p class="np-ws-props-empty">no parsed props for this component</p>
      {/if}
      {#if emits.length}
        <div class="np-ws-emits">
          <span class="np-ws-emits-title">events</span>
          <span class="np-ws-emits-caption">click a pill to subscribe or unsubscribe, interact with the component in the stage to fire subscribed events, firings count on the pill and stream to the console</span>
          <div class="np-ws-emit-pills">
            {#each emits as name (name)}
              <button
                type="button"
                class="np-ws-emit"
                class:np-ws-emit-fired={emitCounts[name]}
                class:np-ws-emit-off={!subscribedEmits.includes(name)}
                title={subscribedEmits.includes(name) ? 'subscribed, click to unsubscribe' : 'unsubscribed, click to subscribe'}
                onclick={() => toggleEmit(name)}
              >
                {name}{#if emitCounts[name]}<span class="np-ws-emit-count">{emitCounts[name]}</span>{/if}
              </button>
            {/each}
          </div>
          <div class="np-ws-console">
            <div class="np-ws-console-bar">
              <input
                type="text"
                class="np-ws-console-filter"
                placeholder="filter by event name or payload"
                bind:value={emitFilter}
              />
              <button type="button" class="np-ws-tool" title="clear the event console" onclick={() => (emitLog = [])}>clear</button>
            </div>
            {#if filteredEmitLog.length}
              <ol class="np-ws-console-log">
                {#each filteredEmitLog as entry, i (i)}
                  <li>
                    <span class="np-ws-console-time">{entry.at}</span>
                    <code class="np-ws-console-name">{entry.name}</code>
                    <span class="np-ws-console-args">{JSON.stringify(entry.args)}</span>
                  </li>
                {/each}
              </ol>
            {:else}
              <p class="np-ws-console-empty">{emitLog.length ? 'no events match the filter' : 'no events fired yet'}</p>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .np-page-shell {
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .np-page {
    display: block;
    width: 100%;
    max-width: var(--np-content-max, 1024px);
    margin: 0 auto;
    padding: 96px 32px 0;
    box-sizing: border-box;
    min-width: 0;
  }

  .np-component-head {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 0 24px;
    border-bottom: 1px solid var(--np-divider);
    margin: 0 0 32px;
  }

  .np-component-badges {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .np-component-system,
  .np-component-package {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 3px 10px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    color: var(--np-text-secondary);
  }

  .np-component-system {
    color: var(--np-brand);
    border-color: var(--np-brand);
    background-color: color-mix(in srgb, var(--np-brand) 14%, transparent);
  }

  .np-component-package {
    text-transform: none;
    letter-spacing: 0.02em;
    font-family: var(--np-font-mono);
  }

  .np-component-title {
    margin: 8px 0 0;
    font-size: 40px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: var(--np-text-primary);
  }

  .np-component-desc {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: var(--np-text-secondary);
  }

  .np-component-claude {
    margin: 40px 0 0;
  }

  .np-component-claude-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 12px;
  }

  .np-component-claude-head h2 {
    margin: 0;
    font-size: 18px;
    color: var(--np-text-primary);
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .np-component-claude-path {
    font-size: 11px;
    font-family: var(--np-font-mono);
    color: var(--np-text-faint);
    font-weight: 400;
  }

  .np-component-claude-missing {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 2px 8px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-danger);
    color: var(--np-danger);
  }

  .np-component-claude-save {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 14px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-brand);
    background-color: color-mix(in srgb, var(--np-brand) 12%, transparent);
    color: var(--np-brand);
    cursor: pointer;
  }

  .np-component-claude-save:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .np-page-tail {
    height: 25vh;
    min-height: 160px;
  }

  .np-page-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 0;
    mask-image: linear-gradient(to bottom, #000 45%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, #000 45%, transparent 100%);
  }

  .np-page-backdrop-doc {
    height: min(360px, 50vh);
    background:
      radial-gradient(ellipse 70% 60% at 30% 0%, color-mix(in srgb, var(--np-brand) 14%, transparent) 0%, transparent 70%),
      linear-gradient(to bottom, color-mix(in srgb, var(--np-brand) 7%, var(--np-bg)) 0%, var(--np-bg) 100%);
  }

  .np-ws {
    display: grid;
    grid-template-areas:
      'toolbar'
      'stage'
      'divider'
      'props';
    grid-template-rows: auto 1fr 6px var(--np-ws-props);
    grid-template-columns: 1fr;
    height: calc(100vh - var(--np-header-height));
    width: 100%;
    min-width: 0;
    background-color: var(--np-bg);
  }

  .np-ws-dock-right {
    grid-template-areas:
      'toolbar toolbar toolbar'
      'stage divider props';
    grid-template-rows: auto 1fr;
    grid-template-columns: 1fr 6px var(--np-ws-props);
  }

  .np-ws-toolbar {
    grid-area: toolbar;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--np-divider);
    min-width: 0;
  }

  .np-ws-crumb {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;
    color: var(--np-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .np-ws-crumb a {
    color: var(--np-text-secondary);
    text-decoration: none;
  }

  .np-ws-crumb a:hover {
    color: var(--np-brand);
  }

  .np-ws-crumb strong {
    color: var(--np-text-primary);
  }

  .np-ws-crumb-sep {
    color: var(--np-text-faint);
  }

  .np-ws-crumb-desc {
    font-size: 12px;
    color: var(--np-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .np-ws-tools {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .np-ws-tool-group {
    display: inline-flex;
    gap: 2px;
  }

  .np-ws-tool {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    color: var(--np-text-secondary);
    cursor: pointer;
    text-decoration: none;
    transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .np-ws-tool:hover {
    color: var(--np-text-primary);
    border-color: var(--np-text-faint);
  }

  .np-ws-vision {
    appearance: auto;
  }

  .np-ws-stage {
    grid-area: stage;
    overflow: auto;
    min-height: 0;
    min-width: 0;
    background:
      repeating-conic-gradient(color-mix(in srgb, var(--np-border) 30%, transparent) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px;
    filter: var(--np-ws-filter);
  }

  .np-ws-frame-wrap {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .np-ws-frame {
    display: block;
    border: 0;
    background: transparent;
    transform: scale(var(--np-ws-zoom));
    transform-origin: 0 0;
    width: calc(100% / var(--np-ws-zoom));
    height: calc(100% / var(--np-ws-zoom));
  }

  .np-ws-divider {
    grid-area: divider;
    cursor: row-resize;
    touch-action: none;
    background: transparent;
  }

  .np-ws-dock-right .np-ws-divider {
    cursor: col-resize;
  }

  .np-ws-dragging .np-ws-frame {
    pointer-events: none;
  }

  .np-ws-props {
    grid-area: props;
    overflow: auto;
    min-height: 0;
    min-width: 0;
    padding: 12px 16px;
    border-top: 1px solid var(--np-divider);
  }

  .np-ws-dock-right .np-ws-props {
    border-top: 0;
    border-left: 1px solid var(--np-divider);
  }

  .np-ws-props-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 10px;
  }

  .np-ws-props-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--np-text-secondary);
  }

  .np-ws-props-empty {
    font-size: 12px;
    color: var(--np-text-faint);
  }

  .np-ws-props-head,
  .np-ws-controls,
  .np-ws-emits {
    width: 100%;
    max-width: 1200px;
    margin-inline: auto;
    box-sizing: border-box;
  }

  .np-ws-controls {
    --np-ws-cols: minmax(180px, 280px) minmax(0, 1fr) auto;
    display: flex;
    flex-direction: column;
  }

  .np-ws-dock-right .np-ws-controls {
    --np-ws-cols: minmax(110px, 40%) minmax(0, 1fr) auto;
  }

  .np-ws-emits {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 18px auto 0;
  }

  .np-ws-emits-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--np-text-secondary);
  }

  .np-ws-emits-caption {
    font-size: 11px;
    color: var(--np-text-muted);
  }

  .np-ws-emit-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .np-ws-emit {
    font-family: var(--np-font-mono);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-brand);
    background-color: transparent;
    color: var(--np-text-secondary);
    cursor: pointer;
  }

  .np-ws-emit-off {
    border-color: var(--np-border);
    color: var(--np-text-faint);
  }

  .np-ws-emit-fired {
    color: var(--np-text-primary);
  }

  .np-ws-emit-count {
    margin-left: 6px;
    padding: 0 5px;
    border-radius: var(--np-radius-pill);
    background-color: color-mix(in srgb, var(--np-brand) 18%, transparent);
    color: var(--np-brand);
    font-weight: 700;
  }

  .np-ws-console {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--np-border);
    border-radius: 8px;
    padding: 8px;
    background-color: var(--np-bg-surface);
  }

  .np-ws-console-bar {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .np-ws-console-filter {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--np-border);
    background-color: var(--np-bg);
    color: var(--np-text-primary);
    font-family: var(--np-font-mono);
  }

  .np-ws-console-log {
    margin: 0;
    padding: 0;
    list-style: none;
    font-family: var(--np-font-mono);
    font-size: 11px;
    line-height: 1.7;
    max-height: 180px;
    overflow-y: auto;
  }

  .np-ws-console-time {
    color: var(--np-text-faint);
    margin-right: 8px;
  }

  .np-ws-console-name {
    color: var(--np-brand);
    margin-right: 8px;
  }

  .np-ws-console-args {
    color: var(--np-text-muted);
    word-break: break-all;
  }

  .np-ws-console-empty {
    margin: 0;
    font-size: 11px;
    color: var(--np-text-faint);
    font-family: var(--np-font-mono);
  }
</style>
