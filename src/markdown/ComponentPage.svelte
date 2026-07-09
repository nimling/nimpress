<script lang="ts">
  import { onMount } from 'svelte'
  import type { ComponentStory, ControlSpec, PageModule } from '../types'
  import CodeEditor from './CodeEditor.svelte'

  let { page }: { page: PageModule } = $props()

  const data = $derived(page.componentData)
  const schema = $derived(page.componentData?.schema)
  const stories = $derived(page.componentData?.stories ?? [])

  let activeStory = $state<string | null>(null)
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

  const emits = $derived(schema?.emits ?? [])

  function defaultValues(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const spec of schema?.props ?? []) {
      if (spec.default !== undefined) out[spec.name] = spec.default
    }
    return out
  }

  function applyStory(story: ComponentStory | null) {
    activeStory = story?.name ?? null
    propValues = { ...defaultValues(), ...(story?.props ?? {}) }
    slotValues = { ...(story?.slots ?? {}) }
    jsonDrafts = {}
    jsonErrors = {}
    for (const spec of schema?.props ?? []) {
      if (spec.kind === 'json') {
        jsonDrafts[spec.name] = propValues[spec.name] === undefined ? '' : JSON.stringify(propValues[spec.name], null, 2)
      }
    }
    push()
  }

  function harnessSrc(): string {
    if (!data) return ''
    const params = new URLSearchParams()
    const initialProps = { ...defaultValues(), ...(stories[0]?.props ?? {}) }
    const initialSlots = { ...(stories[0]?.slots ?? {}) }
    params.set('props', JSON.stringify(initialProps))
    params.set('slots', JSON.stringify(initialSlots))
    params.set('emits', JSON.stringify(schema?.emits ?? []))
    return `${data.harnessPath}?${params.toString()}`
  }

  const initialSrc = $derived(harnessSrc())

  const shareUrl = $derived.by(() => {
    if (!data) return ''
    const params = new URLSearchParams()
    params.set('props', JSON.stringify(propValues))
    params.set('slots', JSON.stringify(slotValues))
    params.set('emits', JSON.stringify(emits))
    return `${data.harnessPath}?${params.toString()}`
  })

  function push() {
    if (!ready || !iframeEl?.contentWindow) return
    iframeEl.contentWindow.postMessage(
      { type: 'nimpress:props', props: $state.snapshot(propValues), slots: $state.snapshot(slotValues), emits: $state.snapshot(emits) },
      '*'
    )
  }

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
    const onMessage = (event: MessageEvent) => {
      const d = event.data
      if (!d || typeof d !== 'object') return
      if (d.type === 'nimpress:ready') {
        ready = true
        applyStory(stories[0] ?? null)
        return
      }
      if (d.type === 'nimpress:emit') {
        emitLog = [{ name: String(d.name), args: (d.args ?? []) as unknown[] }, ...emitLog].slice(0, 50)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  })
</script>

<div class="np-page-backdrop np-page-backdrop-doc" aria-hidden="true"></div>
<div class="np-page-shell">
  <div class="np-page">
    <header class="np-component-head">
      <div class="np-component-badges">
        <span class="np-component-system">{data?.system}</span>
        <span class="np-component-name">{data?.component}</span>
        {#if data?.package}
          <span class="np-component-package">{data.package}{data.version ? `@${data.version}` : ''}</span>
        {/if}
      </div>
      <h1 class="np-component-title">{page.frontmatter.title}</h1>
      {#if page.frontmatter.description}
        <p class="np-component-desc">{page.frontmatter.description}</p>
      {/if}
    </header>

    {#if data}
      <section class="np-workshop">
        {#if stories.length}
          <nav class="np-workshop-stories">
            {#each stories as story (story.name)}
              <button
                type="button"
                class="np-workshop-story"
                class:active={activeStory === story.name}
                title={story.description}
                onclick={() => applyStory(story)}
              >{story.name}</button>
            {/each}
            <button
              type="button"
              class="np-workshop-story"
              class:active={activeStory === null}
              onclick={() => applyStory(null)}
            >playground</button>
          </nav>
        {/if}

        <div class="np-workshop-stage">
          <iframe bind:this={iframeEl} class="np-workshop-frame" src={initialSrc} title={data.component}></iframe>
        </div>

        {#if schema && (schema.props.length || schema.slots.length)}
          <div class="np-workshop-controls">
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
        {/if}

        <div class="np-workshop-share">
          <code>{shareUrl}</code>
        </div>

        {#if emits.length}
          <div class="np-workshop-emits">
            <span class="np-workshop-emits-title">events</span>
            {#each emits as name (name)}
              <code class="np-workshop-emit">{name}</code>
            {/each}
            {#if emitLog.length}
              <ol class="np-workshop-emit-log">
                {#each emitLog as entry, i (i)}
                  <li><code>{entry.name}</code> {JSON.stringify(entry.args)}</li>
                {/each}
              </ol>
            {/if}
          </div>
        {/if}
      </section>
    {/if}

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
  .np-component-name,
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

  .np-workshop {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 0 0 40px;
  }

  .np-workshop-stories {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .np-workshop-story {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    color: var(--np-text-secondary);
    cursor: pointer;
    transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .np-workshop-story:hover {
    color: var(--np-text-primary);
  }

  .np-workshop-story.active {
    color: var(--np-brand);
    border-color: var(--np-brand);
    background-color: color-mix(in srgb, var(--np-brand) 12%, transparent);
  }

  .np-workshop-stage {
    border: 1px solid var(--np-border);
    border-radius: 10px;
    overflow: hidden;
    background:
      repeating-conic-gradient(color-mix(in srgb, var(--np-border) 30%, transparent) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px;
  }

  .np-workshop-frame {
    display: block;
    width: 100%;
    min-height: 240px;
    border: 0;
    background: transparent;
  }

  .np-workshop-controls {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px 16px;
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

  .np-workshop-share {
    font-size: 11px;
    color: var(--np-text-faint);
    overflow-x: auto;
    white-space: nowrap;
    padding: 6px 8px;
    border-radius: 6px;
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-divider);
  }

  .np-workshop-emits {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 12px;
  }

  .np-workshop-emits-title {
    font-weight: 600;
    color: var(--np-text-secondary);
  }

  .np-workshop-emit {
    font-family: var(--np-font-mono);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-border);
    color: var(--np-text-secondary);
  }

  .np-workshop-emit-log {
    flex-basis: 100%;
    margin: 4px 0 0;
    padding: 0 0 0 18px;
    font-size: 12px;
    color: var(--np-text-muted);
    max-height: 160px;
    overflow-y: auto;
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
</style>
