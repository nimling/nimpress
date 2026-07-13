<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { resolvedRoute } from 'sly-svelte-location-router'
  import type { ComponentStory, PageModule } from '../types'
  import { schemaToJsonSchema } from '../modules/parse/typeMembers'
  import { theme } from '../framework/stores/theme'
  import CodeEditor from './CodeEditor.svelte'
  import DragDivider from './DragDivider.svelte'
  import ControlNode, { mockValue, fnSource, isFnValue } from './ControlNode.svelte'
  import IconMock from '../icons/IconMock.svelte'
  import IconClear from '../icons/IconClear.svelte'
  import IconAdd from '../icons/IconAdd.svelte'
  import IconMinus from '../icons/IconMinus.svelte'
  import IconSun from '../icons/IconSun.svelte'
  import IconMoon from '../icons/IconMoon.svelte'
  import IconDock from '../icons/IconDock.svelte'
  import IconReload from '../icons/IconReload.svelte'
  import IconOpen from '../icons/IconOpen.svelte'
  import IconJson from '../icons/IconJson.svelte'
  import IconConsole from '../icons/IconConsole.svelte'
  import IconRemove from '../icons/IconRemove.svelte'

  let { page }: { page: PageModule } = $props()

  const data = $derived(page.componentData)
  const schema = $derived(page.componentData?.schema)
  const stories = $derived(page.componentData?.stories ?? [])
  const emits = $derived(page.componentData?.schema?.emits ?? [])

  const view = $derived.by(() => {
    const path = ($resolvedRoute?.path ?? '').replace(/\/$/, '')
    const base = page.path.replace(/\/$/, '')
    if (path.startsWith(`${base}/`)) {
      const anchor = path.slice(base.length + 1)
      if (stories.some((s) => storyAnchor(s.name) === anchor)) return anchor
    }
    return 'overview'
  })
  let propValues = $state<Record<string, unknown>>({})
  let slotValues = $state<Record<string, string>>({})
  let emitLog = $state<Array<{ name: string; args: unknown[]; at: string }>>([])
  let emitHandlers = $state<Record<string, string>>({})
  let consoleLog = $state<Array<{ level: string; args: unknown[]; at: string }>>([])
  let consoleFilter = $state('')
  let ready = $state(false)
  let claudeDraft = $state('')
  let claudeSaved = $state(true)
  let claudeSaving = $state(false)
  let iframeEl: HTMLIFrameElement | undefined = $state()
  let wsEl: HTMLDivElement | undefined = $state()

  let dock = $state<'bottom' | 'right'>('bottom')
  let propsOpen = $state(true)
  let consoleDock = $state<'bottom' | 'right'>('bottom')
  let consoleOpen = $state(false)
  let dragging = $state(false)
  let bottomSize = $state(300)
  let rightSize = $state(380)
  let bottomSplit = $state(50)
  let rightSplit = $state(50)
  let bottomPanelsEl: HTMLDivElement | undefined = $state()
  let rightPanelsEl: HTMLDivElement | undefined = $state()
  let controlsEl: HTMLDivElement | undefined = $state()
  let infoSize = $state(32)
  let zoom = $state(1)
  let vision = $state('none')
  let visionOpen = $state(false)
  let toolsOpen = $state(false)
  let frameTheme = $state<'light' | 'dark'>('light')
  let controlsEpoch = $state(0)

  interface VisionOption {
    name: string
    filter: string
    dots: [string, string, string]
    blur?: boolean
    dim?: boolean
  }

  const visionOptions: VisionOption[] = [
    { name: 'none', filter: 'none', dots: ['#e5484d', '#30a46c', '#3e63dd'] },
    { name: 'blurred vision', filter: 'blur(2px)', dots: ['#e5484d', '#30a46c', '#3e63dd'], blur: true },
    { name: 'low contrast', filter: 'contrast(0.55)', dots: ['#e5484d', '#30a46c', '#3e63dd'], dim: true },
    { name: 'grayscale', filter: 'grayscale(1)', dots: ['#8a8a8a', '#8a8a8a', '#8a8a8a'] },
    { name: 'protanopia', filter: 'url(#np-vf-protanopia)', dots: ['#8a8a8a', '#30a46c', '#3e63dd'] },
    { name: 'protanomaly', filter: 'url(#np-vf-protanomaly)', dots: ['#b07a7c', '#30a46c', '#3e63dd'] },
    { name: 'deuteranopia', filter: 'url(#np-vf-deuteranopia)', dots: ['#e5484d', '#8a8a8a', '#3e63dd'] },
    { name: 'deuteranomaly', filter: 'url(#np-vf-deuteranomaly)', dots: ['#e5484d', '#7f9f8d', '#3e63dd'] },
    { name: 'tritanopia', filter: 'url(#np-vf-tritanopia)', dots: ['#e5484d', '#30a46c', '#8a8a8a'] },
    { name: 'tritanomaly', filter: 'url(#np-vf-tritanomaly)', dots: ['#e5484d', '#30a46c', '#7c88b0'] },
    { name: 'achromatopsia', filter: 'url(#np-vf-achromatopsia)', dots: ['#6f6f6f', '#9a9a9a', '#5a5a5a'] },
    { name: 'achromatomaly', filter: 'url(#np-vf-achromatomaly)', dots: ['#9c7f80', '#87988c', '#7d84a1'] }
  ]

  const visionMatrices: Record<string, string> = {
    protanopia: '0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0',
    protanomaly: '0.817 0.183 0 0 0 0.333 0.667 0 0 0 0 0.125 0.875 0 0 0 0 0 1 0',
    deuteranopia: '0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0',
    deuteranomaly: '0.8 0.2 0 0 0 0.258 0.742 0 0 0 0 0.142 0.858 0 0 0 0 0 1 0',
    tritanopia: '0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0',
    tritanomaly: '0.967 0.033 0 0 0 0 0.733 0.267 0 0 0 0.183 0.817 0 0 0 0 0 1 0',
    achromatopsia: '0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0',
    achromatomaly: '0.618 0.32 0.062 0 0 0.163 0.775 0.062 0 0 0.163 0.32 0.516 0 0 0 0 0 1 0'
  }

  const visionFilter = $derived(visionOptions.find((o) => o.name === vision)?.filter ?? 'none')

  const activeStory = $derived(
    view === 'overview' ? null : stories.find((s) => storyAnchor(s.name) === view) ?? null
  )

  const emitCounts = $derived.by(() => {
    const counts: Record<string, number> = {}
    for (const entry of emitLog) counts[entry.name] = (counts[entry.name] ?? 0) + 1
    return counts
  })

  function setEmitHandler(name: string, source: string) {
    const next = { ...emitHandlers }
    if (source.trim() === '') delete next[name]
    else next[name] = source
    emitHandlers = next
    persistControls()
    push()
  }

  const bottomOccupied = $derived((propsOpen && dock === 'bottom') || (consoleOpen && consoleDock === 'bottom'))
  const rightOccupied = $derived((propsOpen && dock === 'right') || (consoleOpen && consoleDock === 'right'))
  const bottomShared = $derived(propsOpen && dock === 'bottom' && consoleOpen && consoleDock === 'bottom')
  const rightShared = $derived(propsOpen && dock === 'right' && consoleOpen && consoleDock === 'right')

  const filteredConsoleLog = $derived.by(() => {
    const q = consoleFilter.trim().toLowerCase()
    if (!q) return consoleLog
    return consoleLog.filter(
      (entry) => entry.level.includes(q) || JSON.stringify(entry.args).toLowerCase().includes(q)
    )
  })

  let jsonDialogOpen = $state(false)
  let jsonDialogTab = $state<'input' | 'schema'>('input')
  let jsonAllDraft = $state('')
  let jsonAllError = $state(false)
  let jsonTyping = $state(false)

  $effect(() => {
    const text = JSON.stringify(propValues, null, 2)
    if (!jsonTyping) {
      jsonAllDraft = text
      jsonAllError = false
    }
  })

  function setAllJson(text: string) {
    jsonAllDraft = text
    jsonTyping = true
    try {
      const parsed = JSON.parse(text) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        jsonAllError = true
        return
      }
      jsonAllError = false
      propValues = parsed as Record<string, unknown>
      controlsEpoch++
      persistControls()
      push()
    } catch {
      jsonAllError = true
    }
  }

  const propsJsonSchema = $derived(
    JSON.stringify(schemaToJsonSchema(data?.component ?? '', schema?.props ?? []), null, 2)
  )

  const propCounts = $derived.by(() => {
    const props = schema?.props ?? []
    const populated = props.filter((p) => propValues[p.name] !== undefined).length
    return { total: props.length, populated }
  })

  let copied = $state(false)

  async function copyDialogJson() {
    try {
      await navigator.clipboard.writeText(jsonDialogTab === 'input' ? jsonAllDraft : propsJsonSchema)
      copied = true
      setTimeout(() => (copied = false), 1200)
    } catch {
      copied = false
    }
  }

  function storyAnchor(name: string): string {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
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
    emitHandlers = Object.fromEntries((schema?.emits ?? []).map((name) => [name, fnSource(name)]))
    try {
      const stored = localStorage.getItem(storageKey(story))
      if (stored) {
        const parsed = JSON.parse(stored) as {
          props?: Record<string, unknown>
          slots?: Record<string, string>
          handlers?: Record<string, string>
        }
        if (parsed.props) propValues = parsed.props
        if (parsed.slots) slotValues = parsed.slots
        if (parsed.handlers) emitHandlers = parsed.handlers
      }
    } catch {
      localStorage.removeItem(storageKey(story))
    }
    controlsEpoch++
  }

  function storageKey(story: ComponentStory | null): string {
    return `nimpress:controls:${data?.system}:${data?.component}:${story ? storyAnchor(story.name) : ''}`
  }

  function persistControls() {
    if (!activeStory) return
    try {
      localStorage.setItem(
        storageKey(activeStory),
        JSON.stringify({
          props: $state.snapshot(propValues),
          slots: $state.snapshot(slotValues),
          handlers: $state.snapshot(emitHandlers)
        })
      )
    } catch {
      return
    }
  }

  function clearControls() {
    propValues = {}
    slotValues = {}
    emitHandlers = {}
    controlsEpoch++
    persistControls()
    push()
  }

  const storySrc = $derived.by(() => {
    if (!data || !activeStory) return ''
    const params = new URLSearchParams()
    params.set('story', activeStory.file.replace(/\.story\.ts$/, ''))
    params.set('props', encodeParam({ ...defaultValues(), ...(activeStory.props ?? {}) }))
    params.set('slots', encodeParam({ ...(activeStory.slots ?? {}) }))
    params.set('emits', encodeParam(untrack(() => $state.snapshot(emitHandlers))))
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
        emits: $state.snapshot(emitHandlers),
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
    persistControls()
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
    persistControls()
    push()
  }

  let mockSeed = 0

  function fillMock() {
    mockSeed++
    const next = { ...propValues }
    for (const spec of schema?.props ?? []) {
      const value = mockValue(spec, mockSeed)
      if (value !== undefined) next[spec.name] = value
    }
    propValues = next
    const nextSlots = { ...slotValues }
    for (const spec of schema?.slots ?? []) {
      const value = mockValue({ ...spec, kind: 'slot' }, mockSeed)
      if (typeof value === 'string') nextSlots[spec.name] = value
    }
    slotValues = nextSlots
    const nextHandlers = { ...emitHandlers }
    for (const name of schema?.emits ?? []) {
      if (nextHandlers[name] === undefined) nextHandlers[name] = fnSource(name)
    }
    emitHandlers = nextHandlers
    controlsEpoch++
    persistControls()
    push()
  }

  function resizeBottom(e: PointerEvent) {
    if (!wsEl) return
    const rect = wsEl.getBoundingClientRect()
    bottomSize = Math.min(Math.max(rect.bottom - e.clientY, 140), rect.height * 0.7)
  }

  function resizeRight(e: PointerEvent) {
    if (!wsEl) return
    const rect = wsEl.getBoundingClientRect()
    rightSize = Math.min(Math.max(rect.right - e.clientX, 240), rect.width * 0.7)
  }

  function resizeBottomSplit(e: PointerEvent) {
    if (!bottomPanelsEl) return
    const rect = bottomPanelsEl.getBoundingClientRect()
    bottomSplit = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 20), 80)
  }

  function resizeRightSplit(e: PointerEvent) {
    if (!rightPanelsEl) return
    const rect = rightPanelsEl.getBoundingClientRect()
    rightSplit = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 20), 80)
  }

  function resizeInfo(e: PointerEvent) {
    if (!controlsEl) return
    const rect = controlsEl.getBoundingClientRect()
    infoSize = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 15), 60)
  }

  function toggleDock() {
    dock = dock === 'bottom' ? 'right' : 'bottom'
  }

  function toggleConsoleDock() {
    consoleDock = consoleDock === 'bottom' ? 'right' : 'bottom'
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

  let seededView = ''
  $effect(() => {
    if (view === 'overview') {
      seededView = ''
      return
    }
    if (view === seededView) return
    seededView = view
    ready = false
    emitLog = []
    seedControls(stories.find((s) => storyAnchor(s.name) === view) ?? null)
  })

  onMount(() => {
    claudeDraft = data?.claudeMd ?? ''
    frameTheme = $theme === 'dark' ? 'dark' : 'light'
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
      if (d.type === 'nimpress:console') {
        const at = new Date().toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0')
        consoleLog = [{ level: String(d.level), args: (d.args ?? []) as unknown[], at }, ...consoleLog].slice(0, 300)
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
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  })
</script>

{#snippet visionIcon(option: VisionOption)}
  <svg class="np-ws-vision-icon" viewBox="0 0 24 10" aria-hidden="true">
    <g opacity={option.dim ? 0.45 : 1} filter={option.blur ? 'blur(1px)' : undefined}>
      <circle cx="4" cy="5" r="3.4" fill={option.dots[0]} />
      <circle cx="12" cy="5" r="3.4" fill={option.dots[1]} />
      <circle cx="20" cy="5" r="3.4" fill={option.dots[2]} />
    </g>
  </svg>
{/snippet}

<svg class="np-ws-vision-defs" aria-hidden="true" focusable="false">
  <defs>
    {#each Object.entries(visionMatrices) as [name, matrix] (name)}
      <filter id="np-vf-{name}">
        <feColorMatrix type="matrix" values={matrix} />
      </filter>
    {/each}
  </defs>
</svg>

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
    class:np-ws-dragging={dragging}
    style="--np-ws-bottom: {bottomOccupied ? bottomSize + 'px' : '0px'}; --np-ws-right: {rightOccupied ? rightSize + 'px' : '0px'}; --np-ws-zoom: {zoom}; --np-ws-filter: {visionFilter};"
  >
    {#snippet toolItems()}
      <button
        type="button"
        class="np-ws-tool np-ws-tool-icon np-tip"
        aria-label={frameTheme === 'dark' ? 'switch the component frame to light' : 'switch the component frame to dark'}
        onclick={toggleFrameTheme}
      >
        {#if frameTheme === 'dark'}<IconSun />{:else}<IconMoon />{/if}
      </button>
      <span class="np-ws-tool-group">
        <button type="button" class="np-ws-tool np-ws-tool-icon np-tip" aria-label="zoom out" onclick={() => (zoom = Math.max(0.25, Math.round((zoom - 0.25) * 100) / 100))}><IconMinus /></button>
        <button type="button" class="np-ws-tool np-tip" aria-label="reset zoom to 100%" onclick={() => (zoom = 1)}>{Math.round(zoom * 100)}%</button>
        <button type="button" class="np-ws-tool np-ws-tool-icon np-tip" aria-label="zoom in" onclick={() => (zoom = Math.min(3, Math.round((zoom + 0.25) * 100) / 100))}><IconAdd /></button>
      </span>
      <span class="np-ws-vision-wrap">
        <button
          type="button"
          class="np-ws-tool np-ws-vision-btn np-tip"
          aria-label="vision simulation"
          onclick={() => (visionOpen = !visionOpen)}
        >
          {@render visionIcon(visionOptions.find((o) => o.name === vision) ?? visionOptions[0])}
          {vision}
        </button>
        {#if visionOpen}
          <button class="np-ws-vision-backdrop" aria-label="close" onclick={() => (visionOpen = false)}></button>
          <div class="np-ws-vision-panel">
            {#each visionOptions as option (option.name)}
              <button
                type="button"
                class="np-ws-vision-item"
                class:active={vision === option.name}
                onclick={() => {
                  vision = option.name
                  visionOpen = false
                }}
              >
                {@render visionIcon(option)}
                {option.name}
              </button>
            {/each}
          </div>
        {/if}
      </span>
      <button
        type="button"
        class="np-ws-tool np-ws-tool-icon np-tip"
        class:np-ws-tool-active={propsOpen}
        aria-label={propsOpen ? 'hide the props panel' : 'show the props panel'}
        onclick={() => (propsOpen = !propsOpen)}
      >
        <IconDock side={dock} />
      </button>
      <button
        type="button"
        class="np-ws-tool np-ws-tool-icon np-tip"
        class:np-ws-tool-active={consoleOpen}
        aria-label={consoleOpen ? 'hide the frame console panel' : 'show the frame console panel'}
        onclick={() => (consoleOpen = !consoleOpen)}
      >
        <IconConsole />
      </button>
      <button type="button" class="np-ws-tool np-ws-tool-icon np-tip" aria-label="reload the component frame" onclick={reloadFrame}><IconReload /></button>
      <a class="np-ws-tool np-ws-tool-icon np-tip" href={storySrc} target="_blank" rel="noreferrer" aria-label="open the bare harness in a new tab"><IconOpen /></a>
    {/snippet}
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
        {@render toolItems()}
      </span>
      <span class="np-ws-tools-menu-wrap">
        <button type="button" class="np-ws-tool np-tip" aria-label="workshop actions" onclick={() => (toolsOpen = !toolsOpen)}>⋯</button>
        {#if toolsOpen}
          <button class="np-ws-vision-backdrop" aria-label="close" onclick={() => (toolsOpen = false)}></button>
          <div class="np-ws-tools-panel">
            {@render toolItems()}
          </div>
        {/if}
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

    {#snippet consolePanel()}
      <div class="np-ws-props-head">
        <span class="np-ws-props-title">console</span>
        <span class="np-ws-props-actions">
          <button
            type="button"
            class="np-ws-tool np-ws-tool-icon np-tip"
            aria-label={consoleDock === 'bottom' ? 'dock the console right' : 'dock the console bottom'}
            onclick={toggleConsoleDock}
          >
            <IconDock side={consoleDock === 'bottom' ? 'right' : 'bottom'} />
          </button>
          <button type="button" class="np-ws-tool np-tip" aria-label="clear the console" onclick={() => (consoleLog = [])}>clear</button>
          <button type="button" class="np-ws-tool np-ws-tool-icon np-tip" aria-label="hide the console panel" onclick={() => (consoleOpen = false)}>
            <IconRemove />
          </button>
        </span>
      </div>
      <input
        type="text"
        class="np-ws-console-filter"
        placeholder="filter by level or content"
        bind:value={consoleFilter}
      />
      {#if filteredConsoleLog.length}
        <ol class="np-ws-console-log np-ws-console-log-frame">
          {#each filteredConsoleLog as entry, i (i)}
            <li class="np-console-{entry.level}">
              <span class="np-ws-console-time">{entry.at}</span>
              <code class="np-ws-console-level">{entry.level}</code>
              <span class="np-ws-console-args">{entry.args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}</span>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="np-ws-console-empty">{consoleLog.length ? 'nothing matches the filter' : 'console output from the component frame streams here'}</p>
      {/if}
    {/snippet}

    {#snippet propsPanel()}
      <div class="np-ws-props-head">
        <span class="np-ws-props-title">props</span>
        <span class="np-ws-props-actions">
          <button
            type="button"
            class="np-ws-tool np-ws-tool-icon np-tip"
            aria-label={dock === 'bottom' ? 'dock the props panel right' : 'dock the props panel bottom'}
            onclick={toggleDock}
          >
            <IconDock side={dock === 'bottom' ? 'right' : 'bottom'} />
          </button>
          <button type="button" class="np-ws-tool np-ws-tool-icon np-tip" aria-label="hide the props panel" onclick={() => (propsOpen = false)}>
            <IconRemove />
          </button>
          <button
            type="button"
            class="np-ws-tool np-ws-tool-icon np-tip"
            aria-label="fill every empty control with a sample value"
            onclick={fillMock}
          >
            <IconMock />
            mock
          </button>
          <button
            type="button"
            class="np-ws-tool np-ws-tool-icon np-tip"
            aria-label="empty every input form"
            onclick={clearControls}
          >
            <IconClear />
            clear
          </button>
          <button
            type="button"
            class="np-ws-tool np-ws-tool-icon np-tip"
            aria-label="props as json, view the schema or paste values for all props"
            onclick={() => {
              jsonTyping = false
              jsonAllDraft = JSON.stringify(propValues, null, 2)
              jsonAllError = false
              jsonDialogOpen = true
            }}
          >
            <IconJson />
            json
          </button>
        </span>
      </div>
      {#if jsonDialogOpen}
        <button class="np-ws-dialog-backdrop" aria-label="close" onclick={() => (jsonDialogOpen = false)}></button>
        <div class="np-ws-dialog" role="dialog" aria-label="props json">
          <div class="np-ws-dialog-head">
            <span class="np-ws-dialog-tabs">
              <button
                type="button"
                class="np-ws-tool"
                class:np-ws-tool-active={jsonDialogTab === 'input'}
                title="edit the current prop values as one json object"
                onclick={() => (jsonDialogTab = 'input')}
              >input</button>
              <button
                type="button"
                class="np-ws-tool"
                class:np-ws-tool-active={jsonDialogTab === 'schema'}
                title="json schema of the component props"
                onclick={() => (jsonDialogTab = 'schema')}
              >schema</button>
            </span>
            <span class="np-ws-dialog-tools">
              {#if jsonDialogTab === 'input'}
                <span class="np-ws-dialog-count" title="populated props of total props">
                  {propCounts.populated}/{propCounts.total} props set
                </span>
              {:else}
                <span class="np-ws-dialog-count" title="total props in the schema">{propCounts.total} props</span>
              {/if}
              <button type="button" class="np-ws-tool" title="copy this tab's json to the clipboard" onclick={copyDialogJson}>
                {copied ? 'copied' : 'copy'}
              </button>
              <button type="button" class="np-ws-tool np-ws-tool-icon np-tip" aria-label="close" onclick={() => (jsonDialogOpen = false)}>
                <IconRemove />
              </button>
            </span>
          </div>
          {#if jsonDialogTab === 'input'}
            <div class="np-ws-dialog-body">
              <CodeEditor
                bind:value={
                  () => jsonAllDraft,
                  (next) => setAllJson(next)
                }
                language="json"
                noHeader
                minHeight={360}
                maxHeight={420}
              />
            </div>
            {#if jsonAllError}
              <span class="np-control-error">invalid json, values not applied</span>
            {/if}
          {:else}
            <div class="np-ws-dialog-body">
              <CodeEditor value={propsJsonSchema} language="json" readonly minHeight={360} maxHeight={420} />
            </div>
          {/if}
        </div>
      {/if}
      {#if schema && (schema.props.length || schema.slots.length)}
        {#key `${activeStory.name}:${controlsEpoch}`}
          <div class="np-ws-controls" style="--np-ws-info: {infoSize}%;" bind:this={controlsEl}>
            <DragDivider orientation="vertical" at="calc(var(--np-ws-info, 32%) - 5px)" onmove={resizeInfo} />
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
          <div class="np-ws-controls" style="--np-ws-info: {infoSize}%;">
            {#each emits as name (name)}
              <ControlNode
                spec={{
                  name,
                  kind: 'event',
                  type: '(...args) => void',
                  description: emitCounts[name] ? `runs in the frame on every firing, fired ${emitCounts[name]} times` : 'runs in the frame on every firing'
                }}
                value={emitHandlers[name] !== undefined ? { __nimpressFn: emitHandlers[name] } : undefined}
                onchange={(v) => setEmitHandler(name, isFnValue(v) ? v.__nimpressFn : '')}
              />
            {/each}
          </div>
        </div>
      {/if}
    {/snippet}

    {#if bottomOccupied}
      <div class="np-ws-slot np-ws-slot-bottom">
        <DragDivider orientation="horizontal" onmove={resizeBottom} ondragchange={(d) => (dragging = d)} />
        <div
          class="np-ws-slot-panels np-ws-slot-panels-row"
          class:np-ws-slot-panels-split={bottomShared}
          style="--np-ws-split: {bottomSplit}%;"
          bind:this={bottomPanelsEl}
        >
          {#if propsOpen && dock === 'bottom'}
            <div class="np-panel">{@render propsPanel()}</div>
          {/if}
          {#if bottomShared}
            <DragDivider
              orientation="vertical"
              at="calc(var(--np-ws-split, 50%) - 5px)"
              onmove={resizeBottomSplit}
              ondragchange={(d) => (dragging = d)}
            />
          {/if}
          {#if consoleOpen && consoleDock === 'bottom'}
            <div class="np-panel np-panel-console">{@render consolePanel()}</div>
          {/if}
        </div>
      </div>
    {/if}
    {#if rightOccupied}
      <div class="np-ws-slot np-ws-slot-right">
        <DragDivider orientation="vertical" onmove={resizeRight} ondragchange={(d) => (dragging = d)} />
        <div
          class="np-ws-slot-panels np-ws-slot-panels-column"
          class:np-ws-slot-panels-split={rightShared}
          style="--np-ws-split: {rightSplit}%;"
          bind:this={rightPanelsEl}
        >
          {#if propsOpen && dock === 'right'}
            <div class="np-panel">{@render propsPanel()}</div>
          {/if}
          {#if rightShared}
            <DragDivider
              orientation="horizontal"
              at="calc(var(--np-ws-split, 50%) - 5px)"
              onmove={resizeRightSplit}
              ondragchange={(d) => (dragging = d)}
            />
          {/if}
          {#if consoleOpen && consoleDock === 'right'}
            <div class="np-panel np-panel-console">{@render consolePanel()}</div>
          {/if}
        </div>
      </div>
    {/if}
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
      'toolbar toolbar'
      'stage right'
      'bottom right';
    grid-template-rows: auto minmax(0, 1fr) var(--np-ws-bottom, 0px);
    grid-template-columns: minmax(0, 1fr) var(--np-ws-right, 0px);
    height: 100%;
    width: 100%;
    min-width: 0;
    background-color: var(--np-bg);
  }

  .np-ws-slot {
    position: relative;
    min-width: 0;
    min-height: 0;
  }

  .np-ws-slot-bottom {
    grid-area: bottom;
    border-top: 1px solid var(--np-divider);
  }

  .np-ws-slot-right {
    grid-area: right;
    border-left: 1px solid var(--np-divider);
  }

  .np-ws-slot-panels {
    position: relative;
    display: flex;
    height: 100%;
    min-height: 0;
    min-width: 0;
  }

  .np-ws-slot-panels-row {
    flex-direction: row;
  }

  .np-ws-slot-panels-column {
    flex-direction: column;
  }

  .np-panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px 16px;
  }

  .np-ws-slot-panels-split > .np-panel:first-child {
    flex: 0 0 var(--np-ws-split, 50%);
  }

  .np-ws-slot-panels-split.np-ws-slot-panels-row > .np-panel:last-child {
    border-left: 1px solid var(--np-divider);
  }

  .np-ws-slot-panels-split.np-ws-slot-panels-column > .np-panel:last-child {
    border-top: 1px solid var(--np-divider);
  }

  .np-ws-slot-right .np-panel {
    padding: 12px;
    --np-ws-row-pad: 0px;
  }

  .np-ws-console-log-frame {
    margin: 8px 0 0;
    max-height: none;
  }

  .np-ws-console-level {
    margin-right: 8px;
    color: var(--np-text-secondary);
  }

  .np-console-warn .np-ws-console-level {
    color: #e5a50a;
  }

  .np-console-error .np-ws-console-level {
    color: var(--np-danger);
  }

  .np-panel > .np-ws-console-filter {
    width: 100%;
    margin: 4px 0 0;
  }

  .np-ws-toolbar {
    grid-area: toolbar;
    container-type: inline-size;
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
    min-width: 0;
    flex: 1 1 auto;
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
    flex-wrap: nowrap;
    flex: 0 0 auto;
  }

  .np-ws-tools-menu-wrap {
    position: relative;
    display: none;
    flex: 0 0 auto;
  }

  @container (max-width: 860px) {
    .np-ws-tools {
      display: none;
    }

    .np-ws-tools-menu-wrap {
      display: inline-flex;
    }
  }

  .np-ws-tools-panel {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 41;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    min-width: 180px;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
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

  .np-ws-vision-defs {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
  }

  .np-ws-vision-wrap {
    position: relative;
    display: inline-flex;
  }

  .np-ws-vision-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .np-ws-vision-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: transparent;
    border: 0;
    cursor: default;
  }

  .np-ws-vision-panel {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 41;
    display: flex;
    flex-direction: column;
    min-width: 170px;
    padding: 4px;
    border-radius: 8px;
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .np-ws-vision-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    font-size: 12px;
    text-align: left;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--np-text-secondary);
    cursor: pointer;
    white-space: nowrap;
  }

  .np-ws-vision-item:hover {
    background-color: color-mix(in srgb, var(--np-brand) 10%, transparent);
    color: var(--np-text-primary);
  }

  .np-ws-vision-item.active {
    color: var(--np-brand);
  }

  .np-ws-vision-icon {
    width: 24px;
    height: 10px;
    flex: 0 0 auto;
  }

  .np-ws-props-actions {
    display: inline-flex;
    gap: 6px;
  }

  .np-ws-tool-active {
    color: var(--np-brand);
    border-color: var(--np-brand);
  }

  .np-ws-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(0, 0, 0, 0.35);
    border: 0;
    cursor: default;
  }

  .np-ws-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 61;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(680px, calc(100% - 48px));
    height: min(520px, calc(100% - 48px));
    padding: 12px;
    border-radius: 10px;
    border: 1px solid var(--np-border);
    background-color: var(--np-bg);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  }

  .np-ws-dialog-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .np-ws-dialog-tabs,
  .np-ws-dialog-tools {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .np-ws-dialog-count {
    font-size: 11px;
    font-family: var(--np-font-mono);
    color: var(--np-text-muted);
  }

  .np-ws-dialog-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .np-ws-stage {
    grid-area: stage;
    overflow: hidden;
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

  .np-ws-dragging .np-ws-frame {
    pointer-events: none;
  }

  .np-ws-props-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 10px;
    padding: 0 var(--np-ws-row-pad, 0);
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
    box-sizing: border-box;
  }

  .np-ws-controls {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .np-ws-tool-icon {
    display: inline-flex;
    align-items: center;
    gap: 5px;
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
