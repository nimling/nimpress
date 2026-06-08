<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EditorView, basicSetup } from 'codemirror'
  import { EditorState, Compartment } from '@codemirror/state'
  import { keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
  import { defaultKeymap, history, indentWithTab } from '@codemirror/commands'
  import { json } from '@codemirror/lang-json'
  import { oneDark } from '@codemirror/theme-one-dark'

  let {
    value = $bindable(''),
    language = 'json',
    readonly = false,
    minHeight = 120,
    maxHeight = 360,
    title = ''
  }: {
    value?: string
    language?: 'json' | 'plain'
    readonly?: boolean
    minHeight?: number
    maxHeight?: number
    title?: string
  } = $props()

  let host: HTMLDivElement
  let view: EditorView | null = null
  let copied = $state(false)
  let internalValue = $state(value)

  const themeCompartment = new Compartment()
  const readOnlyCompartment = new Compartment()
  const langCompartment = new Compartment()

  function buildTheme() {
    return EditorView.theme({
      '&': {
        backgroundColor: 'var(--np-bg-code-block)',
        color: 'var(--np-text-code-block)',
        height: '100%'
      },
      '.cm-scroller': {
        fontFamily: 'var(--np-font-mono)',
        fontSize: '12.5px',
        lineHeight: '1.6',
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`
      },
      '.cm-content': { padding: '12px 0' },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        color: 'var(--np-text-faint)',
        border: 'none',
        paddingRight: '8px'
      },
      '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.04)' },
      '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.04)' },
      '&.cm-focused': { outline: 'none' }
    })
  }

  function langExt() {
    return language === 'json' ? json() : []
  }

  onMount(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        lineNumbers(),
        history(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, indentWithTab]),
        langCompartment.of(langExt()),
        themeCompartment.of([oneDark, buildTheme()]),
        readOnlyCompartment.of(EditorState.readOnly.of(readonly)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const v = update.state.doc.toString()
            internalValue = v
            value = v
          }
        })
      ]
    })
    view = new EditorView({ state, parent: host })
  })

  onDestroy(() => {
    view?.destroy()
    view = null
  })

  $effect(() => {
    if (!view) return
    if (value !== internalValue) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value }
      })
      internalValue = value
    }
  })

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      copied = true
      setTimeout(() => (copied = false), 1500)
    } catch {}
  }
</script>

<div class="np-editor">
  {#if title || !readonly}
    <header class="np-editor-bar">
      <span class="np-editor-title">{title || language}</span>
      <button class="np-editor-copy" onclick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
    </header>
  {/if}
  <div class="np-editor-host" bind:this={host}></div>
</div>

<style>
  .np-editor {
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    overflow: hidden;
    background-color: var(--np-bg-code-block);
  }
  .np-editor-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background-color: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .np-editor-title {
    font-size: 12px;
    text-transform: lowercase;
    color: rgba(229, 231, 235, 0.6);
    font-family: var(--np-font-mono);
  }
  .np-editor-copy {
    background: transparent;
    border: 0;
    color: rgba(229, 231, 235, 0.7);
    font-size: 12px;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: var(--np-radius-sm);
  }
  .np-editor-copy:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  .np-editor-host {
    background-color: var(--np-bg-code-block);
  }
</style>
