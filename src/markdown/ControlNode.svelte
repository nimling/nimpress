<script lang="ts">
  import type { ControlSpec } from '../types'
  import { isFnValue, type MockFnValue } from '../mock'
  import { mockValue } from '../modules/parse/typeMembers'
  import ControlNode from './ControlNode.svelte'
  import CodeEditor from './CodeEditor.svelte'
  import IconMock from '../icons/IconMock.svelte'
  import IconClear from '../icons/IconClear.svelte'
  import IconAdd from '../icons/IconAdd.svelte'
  import IconRemove from '../icons/IconRemove.svelte'
  import IconChevron from '../icons/IconChevron.svelte'

  let {
    spec,
    value,
    onchange,
    depth = 0,
    onremove,
    onrename
  }: {
    spec: ControlSpec
    value: unknown
    onchange: (value: unknown) => void
    depth?: number
    onremove?: () => void
    onrename?: (next: string) => void
  } = $props()

  let jsonDraft = $state(value === undefined ? '' : JSON.stringify(value, null, 2))
  let jsonError = $state(false)
  let inputOpen = $state(true)

  const record = $derived(
    (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>
  )
  const rows = $derived(Array.isArray(value) ? (value as unknown[]) : [])
  const missing = $derived(!!spec.required && (value === undefined || value === ''))

  function setMember(memberName: string, memberValue: unknown) {
    const next = { ...record }
    if (memberValue === undefined) delete next[memberName]
    else next[memberName] = memberValue
    onchange(next)
  }

  function setRow(index: number, rowValue: unknown) {
    const next = [...rows]
    next[index] = rowValue
    onchange(next)
  }

  function removeRow(index: number) {
    onchange(rows.filter((_, i) => i !== index))
  }

  function emptyValue(item: ControlSpec): unknown {
    if (item.kind === 'boolean') return false
    if (item.kind === 'number') return 0
    if (item.kind === 'text' || item.kind === 'slot') return ''
    if (item.kind === 'select') return item.options?.[0] ?? ''
    if (item.kind === 'array') return []
    if (item.kind === 'object') {
      const out: Record<string, unknown> = {}
      for (const m of item.members ?? []) {
        if (!m.required) continue
        const v = emptyValue(m)
        if (v !== undefined) out[m.name] = v
      }
      return out
    }
    return undefined
  }

  function addRow() {
    if (!spec.item) return
    onchange([...rows, emptyValue(spec.item)])
  }

  function nextKey(): string {
    let n = Object.keys(record).length + 1
    while (record[`key${n}`] !== undefined) n++
    return `key${n}`
  }

  function addEntry() {
    onchange({ ...record, [nextKey()]: spec.item ? emptyValue(spec.item) : '' })
  }

  function renameEntry(key: string, next: string) {
    if (!next || next === key || record[next] !== undefined) return
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(record)) {
      out[k === key ? next : k] = v
    }
    onchange(out)
  }

  function removeEntry(key: string) {
    const next = { ...record }
    delete next[key]
    onchange(next)
  }

  let mockSeed = 0

  function mockSelf() {
    mockSeed++
    if (spec.kind === 'array') {
      if (spec.item) onchange([...rows, mockValue(spec.item, mockSeed)])
      return
    }
    if (spec.kind === 'record') {
      const mocked = mockValue(spec, mockSeed)
      if (mocked && typeof mocked === 'object') onchange({ ...record, ...(mocked as Record<string, unknown>) })
      return
    }
    const next = mockValue(spec, mockSeed)
    if (spec.kind === 'json') {
      jsonDraft = next === undefined ? '' : JSON.stringify(next, null, 2)
      jsonError = false
    }
    onchange(next)
  }

  function setJson(text: string) {
    jsonDraft = text
    if (text.trim() === '') {
      jsonError = false
      onchange(undefined)
      return
    }
    try {
      const parsed = JSON.parse(text) as unknown
      jsonError = false
      onchange(parsed)
    } catch {
      jsonError = true
    }
  }

  function clearSelf() {
    jsonDraft = ''
    jsonError = false
    onchange(undefined)
  }
</script>

{#snippet info()}
  <div class="np-control-head" style="padding-left: {depth * 14}px">
    {#if onrename}
      <input
        type="text"
        class="np-control-key"
        value={spec.name}
        title="entry key, edit to rename"
        onchange={(e) => onrename(e.currentTarget.value.trim())}
      />
    {:else}
      <span class="np-control-label">
        {spec.name}{#if spec.required}<span class="np-control-required">*</span>{/if}
      </span>
    {/if}
    <div class="np-control-actions">
      {#if spec.kind === 'array'}
        <button type="button" class="np-control-act np-tip" aria-label="add an empty item" onclick={addRow}>
          <IconAdd />
        </button>
        <button type="button" class="np-control-act np-tip" aria-label="add an item filled with sample data" onclick={mockSelf}>
          <IconMock />
        </button>
      {:else if spec.kind === 'record'}
        <button type="button" class="np-control-act np-tip" aria-label="add an empty entry" onclick={addEntry}>
          <IconAdd />
        </button>
        <button type="button" class="np-control-act np-tip" aria-label="add sample entries" onclick={mockSelf}>
          <IconMock />
        </button>
      {:else if spec.kind === 'function'}
        <button type="button" class="np-control-act np-tip" aria-label="create a stub function that logs its calls" onclick={mockSelf}>
          <IconMock />
        </button>
      {:else if spec.kind !== 'json'}
        <button type="button" class="np-control-act np-tip" aria-label="fill with sample data" onclick={mockSelf}>
          <IconMock />
        </button>
      {/if}
      <button type="button" class="np-control-act np-tip" aria-label="clear this input" onclick={clearSelf}>
        <IconClear />
      </button>
      {#if onremove}
        <button type="button" class="np-control-act np-control-act-remove np-tip" aria-label="remove item" onclick={onremove}>
          <IconRemove />
        </button>
      {/if}
    </div>
  </div>
  <div class="np-control-info" style="padding-left: {depth * 14}px">
    <code class="np-control-type" title={spec.shape ?? spec.type}>{spec.type}</code>
    {#if spec.description}
      <span class="np-control-desc">{spec.description}</span>
    {/if}
  </div>
{/snippet}

{#if spec.kind === 'object'}
  <div class="np-control np-control-kind-object">
    {@render info()}
    <div class="np-control-input">
      <span class="np-control-note">{(spec.members ?? []).length} fields</span>
    </div>
  </div>
  {#each spec.members ?? [] as member (member.name)}
    <ControlNode spec={member} value={record[member.name]} depth={depth + 1} onchange={(v) => setMember(member.name, v)} />
  {/each}
{:else if spec.kind === 'array'}
  <div class="np-control np-control-kind-array">
    {@render info()}
    <div class="np-control-input">
      <span class="np-control-note">{rows.length} items</span>
    </div>
  </div>
  {#each rows as row, i (i)}
    {#if spec.item}
      <ControlNode
        spec={{ ...spec.item, name: `${i}` }}
        value={row}
        depth={depth + 1}
        onchange={(v) => setRow(i, v)}
        onremove={() => removeRow(i)}
      />
    {/if}
  {/each}
{:else if spec.kind === 'record'}
  <div class="np-control np-control-kind-record">
    {@render info()}
    <div class="np-control-input">
      <span class="np-control-note">{Object.keys(record).length} entries</span>
    </div>
  </div>
  {#each Object.keys(record) as key (key)}
    <ControlNode
      spec={{ ...(spec.item ?? { name: '', kind: 'json', type: 'unknown' }), name: key }}
      value={record[key]}
      depth={depth + 1}
      onchange={(v) => setMember(key, v)}
      onremove={() => removeEntry(key)}
      onrename={(next) => renameEntry(key, next)}
    />
  {/each}
{:else if spec.kind === 'event'}
  <div class="np-control np-control-kind-event">
    <div class="np-control-head">
      <span class="np-control-label">{spec.name}</span>
      <div class="np-control-actions">
        <button type="button" class="np-control-act np-tip" aria-label="reset to a stub function that logs its calls" onclick={mockSelf}>
          <IconMock />
        </button>
        <button type="button" class="np-control-act np-tip" aria-label="clear the handler, the event detaches" onclick={clearSelf}>
          <IconClear />
        </button>
        <button
          type="button"
          class="np-control-act np-tip"
          aria-label={inputOpen ? 'hide the handler code' : 'show the handler code'}
          onclick={() => (inputOpen = !inputOpen)}
        >
          <IconChevron open={inputOpen} />
        </button>
      </div>
    </div>
    <div class="np-control-info np-control-wide">
      <code class="np-control-type" title={spec.shape ?? spec.type}>{spec.type}</code>
      {#if spec.description}
        <span class="np-control-desc">{spec.description}</span>
      {/if}
    </div>
    {#if inputOpen}
      <div class="np-control-input np-control-wide">
        <CodeEditor
          bind:value={
            () => (isFnValue(value) ? value.__nimpressFn : ''),
            (next) => onchange(next.trim() === '' ? undefined : { __nimpressFn: next })
          }
          language="javascript"
          noHeader
          minHeight={72}
          maxHeight={220}
        />
      </div>
    {/if}
  </div>
{:else}
  <div class="np-control np-control-kind-{spec.kind}">
    {@render info()}
    <div class="np-control-input">
      {#if spec.kind === 'boolean'}
        <input type="checkbox" checked={!!value} onchange={(e) => onchange(e.currentTarget.checked)} />
      {:else if spec.kind === 'number'}
        <input
          type="number"
          class:invalid={missing}
          value={value ?? ''}
          oninput={(e) => onchange(e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))}
        />
      {:else if spec.kind === 'select'}
        <select
          class:invalid={missing}
          value={String(value ?? '')}
          onchange={(e) => onchange(e.currentTarget.value === '' ? undefined : e.currentTarget.value)}
        >
          <option value=""></option>
          {#each spec.options ?? [] as option (option)}
            <option value={option}>{option}</option>
          {/each}
        </select>
      {:else if spec.kind === 'function'}
        {#if isFnValue(value)}
          <CodeEditor
            bind:value={
              () => (value as MockFnValue).__nimpressFn,
              (next) => onchange(next.trim() === '' ? undefined : { __nimpressFn: next })
            }
            language="javascript"
            noHeader
            minHeight={72}
            maxHeight={220}
          />
        {:else}
          <span class="np-control-note">no handler, mock writes an editable function that logs its calls</span>
        {/if}
      {:else if spec.kind === 'json'}
        <div class="np-control-json-editor" class:invalid={jsonError || missing}>
          <CodeEditor
            bind:value={
              () => jsonDraft,
              (next) => setJson(next)
            }
            language="json"
            noHeader
            minHeight={72}
            maxHeight={220}
          />
        </div>
        {#if jsonError}
          <span class="np-control-error">invalid json, value not applied</span>
        {/if}
      {:else}
        <input
          type="text"
          class:invalid={missing}
          value={String(value ?? '')}
          oninput={(e) => onchange(e.currentTarget.value === '' ? undefined : e.currentTarget.value)}
        />
      {/if}
      {#if missing}
        <span class="np-control-error">required</span>
      {/if}
    </div>
  </div>
{/if}

<style>
  .np-control {
    display: grid;
    grid-template-columns: minmax(140px, var(--np-ws-info, 32%)) minmax(0, 1fr);
    gap: 4px 12px;
    align-items: start;
    padding: 6px var(--np-ws-row-pad, 0);
    border-bottom: 1px solid color-mix(in srgb, var(--np-border) 55%, transparent);
    min-width: 0;
  }

  .np-control-head {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .np-control-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .np-control-wide {
    grid-column: 1 / -1;
  }

  .np-control-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--np-text-primary);
  }

  .np-control-key {
    font-size: 12px;
    font-weight: 600;
    font-family: var(--np-font-mono);
    color: var(--np-text-primary);
    background-color: var(--np-bg-surface);
    border: 1px solid var(--np-border);
    border-radius: 6px;
    padding: 2px 6px;
    min-width: 0;
    width: 140px;
  }

  .np-control-required {
    color: var(--np-danger);
    margin-left: 2px;
  }

  .np-control-type {
    font-size: 10px;
    line-height: 1.4;
    color: var(--np-text-faint);
    font-family: var(--np-font-mono);
    white-space: normal;
    word-break: break-word;
  }

  .np-control-desc {
    font-size: 11px;
    line-height: 1.4;
    color: var(--np-text-muted);
  }

  .np-control-input {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .np-control-note {
    font-size: 11px;
    color: var(--np-text-faint);
    padding: 5px 0;
  }

  .np-control-note-set {
    color: var(--np-brand);
  }

  .np-control-error {
    font-size: 11px;
    color: var(--np-danger);
  }

  .np-control-actions {
    display: flex;
    gap: 4px;
    flex: 0 0 auto;
  }

  .np-control-act {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 4px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    color: var(--np-text-secondary);
    cursor: pointer;
  }

  .np-control-act:hover {
    color: var(--np-text-primary);
    border-color: var(--np-text-faint);
  }

  .np-control-act-remove:hover {
    color: var(--np-danger);
    border-color: var(--np-danger);
  }

  .np-control-input input.invalid,
  .np-control-input select.invalid {
    border-color: var(--np-danger);
  }

  .np-control-input input[type='text'],
  .np-control-input input[type='number'],
  .np-control-input select,
  .np-control-json {
    width: 100%;
    box-sizing: border-box;
    font-size: 13px;
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
    font-family: inherit;
  }

  .np-control-input input[type='checkbox'] {
    width: 15px;
    height: 15px;
    margin: 5px 0 0;
    align-self: flex-start;
    accent-color: var(--np-brand);
  }

  .np-control-json {
    font-family: var(--np-font-mono);
    font-size: 12px;
    min-height: 64px;
    resize: vertical;
  }

  .np-control-json-editor {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid transparent;
    border-radius: 6px;
  }

  .np-control-json-editor.invalid {
    border-color: var(--np-danger);
  }

  .np-control-json.invalid {
    border-color: var(--np-danger);
  }
</style>
