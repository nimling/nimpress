<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EditorView, basicSetup } from 'codemirror'
  import { EditorState, Compartment } from '@codemirror/state'
  import { keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
  import { defaultKeymap, history, indentWithTab } from '@codemirror/commands'
  import { json } from '@codemirror/lang-json'
  import { javascript } from '@codemirror/lang-javascript'
  import { python } from '@codemirror/lang-python'
  import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language'
  import { shell } from '@codemirror/legacy-modes/mode/shell'
  import { go } from '@codemirror/legacy-modes/mode/go'
  import { csharp } from '@codemirror/legacy-modes/mode/clike'
  import { tags as t } from '@lezer/highlight'

  const npHighlight = HighlightStyle.define([
    { tag: t.keyword, color: '#E89B7D', fontWeight: '600' },
    { tag: [t.controlKeyword, t.moduleKeyword, t.definitionKeyword, t.operatorKeyword], color: '#E89B7D', fontWeight: '600' },
    { tag: [t.atom, t.bool, t.null], color: '#D19A66' },
    { tag: t.number, color: '#D19A66' },
    { tag: [t.string, t.special(t.string)], color: '#98C379' },
    { tag: t.regexp, color: '#98C379' },
    { tag: [t.escape, t.character], color: '#56B6C2' },
    { tag: t.comment, color: '#7F848E', fontStyle: 'italic' },
    { tag: t.lineComment, color: '#7F848E', fontStyle: 'italic' },
    { tag: t.blockComment, color: '#7F848E', fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#61AFEF' },
    { tag: [t.variableName, t.name], color: '#E5C07B' },
    { tag: [t.propertyName, t.attributeName], color: '#E5C07B' },
    { tag: [t.typeName, t.className, t.namespace], color: '#E5C07B', fontWeight: '600' },
    { tag: [t.tagName, t.angleBracket], color: '#E06C75' },
    { tag: [t.operator, t.derefOperator, t.compareOperator, t.arithmeticOperator, t.logicOperator, t.bitwiseOperator, t.updateOperator], color: '#56B6C2' },
    { tag: [t.punctuation, t.separator, t.bracket, t.brace, t.paren, t.squareBracket], color: '#ABB2BF' },
    { tag: t.meta, color: '#9D5A45' },
    { tag: [t.url, t.link], color: '#61AFEF', textDecoration: 'underline' },
    { tag: t.invalid, color: '#E06C75', textDecoration: 'underline wavy' },
    { tag: [t.heading, t.strong], fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' }
  ])

  let {
    value = $bindable(''),
    language = 'json',
    readonly = false,
    minHeight = 120,
    maxHeight = 360,
    fitContent = false,
    title = '',
    variant = 'default',
    showLineNumbers = true
  }: {
    value?: string
    language?: string
    readonly?: boolean
    minHeight?: number
    maxHeight?: number
    fitContent?: boolean
    title?: string
    variant?: 'default' | 'try'
    showLineNumbers?: boolean
  } = $props()

  let host: HTMLDivElement
  let view: EditorView | null = null
  let copied = $state(false)
  let internalValue = $state(value)

  const themeCompartment = new Compartment()
  const readOnlyCompartment = new Compartment()
  const langCompartment = new Compartment()

  function buildTheme() {
    const tryVariant = variant === 'try'
    const bg = tryVariant
      ? 'color-mix(in srgb, var(--np-brand) 6%, var(--np-bg-code-block))'
      : 'var(--np-bg-code-block)'
    const activeBg = tryVariant
      ? 'color-mix(in srgb, var(--np-brand) 14%, transparent)'
      : 'rgba(255,255,255,0.04)'
    const gutterColor = tryVariant
      ? 'color-mix(in srgb, var(--np-brand) 50%, var(--np-text-faint))'
      : 'var(--np-text-faint)'
    const selection = tryVariant
      ? 'color-mix(in srgb, var(--np-brand) 45%, transparent)'
      : 'color-mix(in srgb, var(--np-brand) 40%, transparent)'
    const caretColor = tryVariant ? 'var(--np-brand)' : 'var(--np-text-code-block)'
    return EditorView.theme({
      '&': {
        backgroundColor: bg,
        color: 'var(--np-text-code-block)',
        height: '100%'
      },
      '.cm-scroller': {
        fontFamily: 'var(--np-font-mono)',
        fontSize: '12.5px',
        lineHeight: '1.65',
        minHeight: `${minHeight}px`,
        maxHeight: fitContent ? 'none' : `${maxHeight}px`,
        overflow: fitContent ? 'visible' : 'auto',
        backgroundColor: bg
      },
      '.cm-line': { backgroundColor: 'transparent' },
      '.cm-content': showLineNumbers
        ? { padding: '12px 0', caretColor }
        : { padding: '12px 20px', caretColor },
      '.cm-cursor': { borderLeftColor: caretColor, borderLeftWidth: '2px' },
      '.cm-gutters': showLineNumbers
        ? {
            backgroundColor: tryVariant
              ? 'color-mix(in srgb, var(--np-brand) 4%, transparent)'
              : 'transparent',
            color: gutterColor,
            border: 'none',
            paddingRight: '8px'
          }
        : { display: 'none' },
      '.cm-activeLine': { backgroundColor: activeBg },
      '.cm-activeLineGutter': { backgroundColor: activeBg },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: selection + ' !important'
      },
      '&.cm-focused': { outline: 'none' }
    })
  }

  function langExt() {
    const lang = (language || '').toLowerCase()
    if (lang === 'json') return json()
    if (lang === 'typescript' || lang === 'ts') return javascript({ typescript: true })
    if (lang === 'javascript' || lang === 'js') return javascript()
    if (lang === 'python' || lang === 'py') return python()
    if (lang === 'go') return StreamLanguage.define(go)
    if (lang === 'bash' || lang === 'sh' || lang === 'shell' || lang === 'curl') return StreamLanguage.define(shell)
    if (lang === 'dotnet' || lang === 'csharp' || lang === 'cs' || lang === 'c#') return StreamLanguage.define(csharp)
    return []
  }

  onMount(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        lineNumbers(),
        history(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, indentWithTab]),
        langCompartment.of(langExt()),
        themeCompartment.of([syntaxHighlighting(npHighlight), buildTheme()]),
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
