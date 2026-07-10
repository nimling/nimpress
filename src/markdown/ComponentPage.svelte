<script lang="ts">
  import { onMount } from 'svelte'
  import type { ComponentStory, ControlSpec, PageModule } from '../types'
  import { theme, toggleTheme } from '../framework/stores/theme'
  import CodeEditor from './CodeEditor.svelte'

  let { page }: { page: PageModule } = $props()

  const data = $derived(page.componentData)
  const schema = $derived(page.componentData?.schema)
  const stories = $derived(page.componentData?.stories ?? [])
  const emits = $derived(page.componentData?.schema?.emits ?? [])

  let view = $state('overview')
  let propValues = $state<Record<string, unknown>>({})
  let slotValues = $state<Record<string, string>>({})
  let emitLog = $state<Array<{ name: string; args: unknown[] }>>([])
  let jsonDrafts = $state<Record<string, string>>({})
  let jsonErrors = $state<Record<string, boolean>>({})
  let ready = $state(false)
  let claudeDraft = $state('')
  let claudeSaved = $state(true)
  let claudeSaving = $state(false)
  let iframeEl: HTMLIFrameElement | undefined = $state()

  let dock = $state<'bottom' | 'right'>('bottom')
  let propsSize = $state(300)
  let zoom = $state(1)
  let vision = $state('none')

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
    jsonDrafts = {}
    jsonErrors = {}
    for (const spec of schema?.props ?? []) {
      if (spec.kind === 'json') {
        jsonDrafts[spec.name] = propValues[spec.name] === undefined ? '' : JSON.stringify(propValues[spec.name], null, 2)
      }
    }
  }

  const storySrc = $derived.by(() => {
    if (!data || !activeStory) return ''
    const params = new URLSearchParams()
    params.set('story', activeStory.file.replace(/\.story\.ts$/, ''))
    params.set('props', encodeParam({ ...defaultValues(), ...(activeStory.props ?? {}) }))
    params.set('slots', encodeParam({ ...(activeStory.slots ?? {}) }))
    params.set('emits', encodeParam(schema?.emits ?? []))
    params.set('theme', $theme)
    return `${data.harnessPath}?${params.toString()}`
  })

  function push() {
    if (!ready || !iframeEl?.contentWindow) return
    iframeEl.contentWindow.postMessage(
      {
        type: 'nimpress:props',
        props: $state.snapshot(propValues),
        slots: $state.snapshot(slotValues),
        emits: $state.snapshot(emits),
        theme: $theme
      },
      '*'
    )
  }

  $effect(() => {
    $theme
    push()
  })

  function setProp(name: string, value: unknown) {
    propValues = { ...propValues, [name]: value }
    push()
  }

  function setJsonProp(spec: ControlSpec, text: string) {
    jsonDrafts = { ...jsonDrafts, [spec.name]: text }
    if (text.trim() === '') {
      jsonErrors = { ...jsonErrors, [spec.name]: false }
      const next = { ...propValues }
      delete next[spec.name]
      propValues = next
      push()
      return
    }
    try {
      const parsed = JSON.parse(text)
      jsonErrors = { ...jsonErrors, [spec.name]: false }
      setProp(spec.name, parsed)
    } catch {
      jsonErrors = { ...jsonErrors, [spec.name]: true }
    }
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

  function mockValue(spec: ControlSpec): unknown {
    if (spec.kind === 'select') return spec.options?.[0]
    if (spec.kind === 'boolean') return true
    if (spec.kind === 'number') return 42
    if (spec.kind === 'text') return `Sample ${spec.name}`
    return undefined
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

  function startDrag(event: PointerEvent) {
    event.preventDefault()
    const move = (ev: PointerEvent) => {
      if (dock === 'bottom') {
        propsSize = Math.min(Math.max(window.innerHeight - ev.clientY, 140), window.innerHeight * 0.7)
      } else {
        propsSize = Math.min(Math.max(window.innerWidth - ev.clientX, 240), window.innerWidth * 0.7)
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
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
        emitLog = [{ name: String(d.name), args: (d.args ?? []) as unknown[] }, ...emitLog].slice(0, 50)
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

      {#if data?.claudeMd !== undefined}
        <section class="np-component-claude">
          <div class="np-component-claude-head">
            <h2>CLAUDE.md</h2>
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
    class="np-ws"
    class:np-ws-dock-right={dock === 'right'}
    style="--np-ws-props: {propsSize}px; --np-ws-zoom: {zoom}; --np-ws-filter: {visionFilters[vision]};"
  >
    <div class="np-ws-toolbar">
      <span class="np-ws-crumb">
        <a href={page.path}>{page.frontmatter.title}</a>
        <span class="np-ws-crumb-sep">/</span>
        <strong>{activeStory.name}</strong>
      </span>
      <span class="np-ws-tools">
        <button type="button" class="np-ws-tool" title="toggle theme" onclick={toggleTheme}>{$theme === 'dark' ? 'light' : 'dark'}</button>
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

    <div class="np-ws-stage">
      <div class="np-ws-frame-wrap">
        <iframe bind:this={iframeEl} class="np-ws-frame" src={storySrc} title={data.component}></iframe>
      </div>
    </div>

    <div
      class="np-ws-divider"
      role="separator"
      aria-orientation={dock === 'bottom' ? 'horizontal' : 'vertical'}
      onpointerdown={startDrag}
    ></div>

    <div class="np-ws-props">
      <div class="np-ws-props-head">
        <span class="np-ws-props-title">props</span>
        <button type="button" class="np-ws-tool" onclick={fillMock}>mock</button>
      </div>
      {#if schema && (schema.props.length || schema.slots.length)}
        <div class="np-ws-controls">
          {#each schema.props as spec (spec.name)}
            <label class="np-control">
              <span class="np-control-name">
                {spec.name}{#if spec.required}<span class="np-control-required">*</span>{/if}
                <code class="np-control-type">{spec.type}</code>
              </span>
              {#if spec.kind === 'boolean'}
                <input
                  type="checkbox"
                  checked={!!propValues[spec.name]}
                  onchange={(e) => setProp(spec.name, e.currentTarget.checked)}
                />
              {:else if spec.kind === 'number'}
                <input
                  type="number"
                  value={propValues[spec.name] ?? ''}
                  oninput={(e) => setProp(spec.name, e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))}
                />
              {:else if spec.kind === 'select'}
                <select
                  value={String(propValues[spec.name] ?? '')}
                  onchange={(e) => setProp(spec.name, e.currentTarget.value)}
                >
                  <option value=""></option>
                  {#each spec.options ?? [] as option (option)}
                    <option value={option}>{option}</option>
                  {/each}
                </select>
              {:else if spec.kind === 'json'}
                <textarea
                  class="np-control-json"
                  class:invalid={jsonErrors[spec.name]}
                  value={jsonDrafts[spec.name] ?? ''}
                  oninput={(e) => setJsonProp(spec, e.currentTarget.value)}
                ></textarea>
              {:else}
                <input
                  type="text"
                  value={String(propValues[spec.name] ?? '')}
                  oninput={(e) => setProp(spec.name, e.currentTarget.value === '' ? undefined : e.currentTarget.value)}
                />
              {/if}
            </label>
          {/each}
          {#each schema.slots as spec (spec.name)}
            <label class="np-control">
              <span class="np-control-name">
                {spec.name}
                <code class="np-control-type">slot</code>
              </span>
              <input
                type="text"
                value={slotValues[spec.name] ?? ''}
                oninput={(e) => setSlot(spec.name, e.currentTarget.value)}
              />
            </label>
          {/each}
        </div>
      {:else}
        <p class="np-ws-props-empty">no parsed props for this component</p>
      {/if}
      {#if emits.length}
        <div class="np-ws-emits">
          {#each emits as name (name)}
            <code class="np-ws-emit">{name}</code>
          {/each}
          {#if emitLog.length}
            <ol class="np-ws-emit-log">
              {#each emitLog as entry, i (i)}
                <li><code>{entry.name}</code> {JSON.stringify(entry.args)}</li>
              {/each}
            </ol>
          {/if}
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
    background-color: var(--np-divider);
    transition: background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .np-ws-dock-right .np-ws-divider {
    cursor: col-resize;
  }

  .np-ws-divider:hover {
    background-color: var(--np-brand);
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

  .np-ws-controls {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px 14px;
  }

  .np-ws-dock-right .np-ws-controls {
    grid-template-columns: 1fr;
  }

  .np-control {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .np-control-name {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--np-text-secondary);
  }

  .np-control-required {
    color: var(--np-danger);
  }

  .np-control-type {
    font-size: 10px;
    color: var(--np-text-faint);
    font-family: var(--np-font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 140px;
  }

  .np-control input[type='text'],
  .np-control input[type='number'],
  .np-control select,
  .np-control-json {
    font-size: 13px;
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
    font-family: inherit;
  }

  .np-control-json {
    font-family: var(--np-font-mono);
    font-size: 12px;
    min-height: 60px;
    resize: vertical;
  }

  .np-control-json.invalid {
    border-color: var(--np-danger);
  }

  .np-ws-emits {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin: 14px 0 0;
  }

  .np-ws-emit {
    font-family: var(--np-font-mono);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-border);
    color: var(--np-text-secondary);
  }

  .np-ws-emit-log {
    flex-basis: 100%;
    margin: 6px 0 0;
    padding: 0 0 0 18px;
    font-size: 12px;
    color: var(--np-text-muted);
    max-height: 140px;
    overflow-y: auto;
  }
</style>
