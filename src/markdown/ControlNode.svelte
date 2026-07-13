<script module lang="ts">
  import type { ControlSpec } from '../types'

  export function mockValue(spec: ControlSpec): unknown {
    if (spec.kind === 'select') return spec.options?.[0]
    if (spec.kind === 'boolean') return true
    if (spec.kind === 'number') return 42
    if (spec.kind === 'text' || spec.kind === 'slot') return spec.name ? `Sample ${spec.name}` : 'Sample text'
    if (spec.kind === 'object') {
      const out: Record<string, unknown> = {}
      for (const member of spec.members ?? []) {
        const v = mockValue(member)
        if (v !== undefined) out[member.name] = v
      }
      return Object.keys(out).length ? out : undefined
    }
    if (spec.kind === 'array') {
      const v = spec.item ? mockValue(spec.item) : undefined
      return v === undefined ? undefined : [v]
    }
    return undefined
  }
</script>

<script lang="ts">
  import ControlNode from './ControlNode.svelte'

  let {
    spec,
    value,
    onchange,
    depth = 0,
    onremove
  }: {
    spec: ControlSpec
    value: unknown
    onchange: (value: unknown) => void
    depth?: number
    onremove?: () => void
  } = $props()

  let jsonDraft = $state(value === undefined ? '' : JSON.stringify(value, null, 2))
  let jsonError = $state(false)

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

  function mockSelf() {
    if (spec.kind === 'array') {
      if (spec.item) onchange([...rows, mockValue(spec.item)])
      return
    }
    onchange(mockValue(spec))
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
</script>

{#snippet info()}
  <div class="np-control-info" style="padding-left: {depth * 14}px">
    <span class="np-control-label">
      {spec.name}{#if spec.required}<span class="np-control-required">*</span>{/if}
    </span>
    <code class="np-control-type" title={spec.shape ?? spec.type}>{spec.type}</code>
    {#if spec.description}
      <span class="np-control-desc">{spec.description}</span>
    {/if}
  </div>
{/snippet}

{#snippet actions()}
  <div class="np-control-actions">
    {#if spec.kind === 'array'}
      <button type="button" class="np-control-act" title="add an empty item" onclick={addRow}>add</button>
      <button type="button" class="np-control-act" title="add an item filled with sample data" onclick={mockSelf}>mock</button>
    {:else if spec.kind !== 'json'}
      <button type="button" class="np-control-act" title="fill with sample data" onclick={mockSelf}>mock</button>
    {/if}
    {#if onremove}
      <button type="button" class="np-control-act np-control-act-remove" title="remove item" onclick={onremove}>✕</button>
    {/if}
  </div>
{/snippet}

{#if spec.kind === 'object'}
  <div class="np-control np-control-kind-object">
    {@render info()}
    <div class="np-control-input">
      <span class="np-control-note">{(spec.members ?? []).length} fields</span>
    </div>
    {@render actions()}
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
    {@render actions()}
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
      {:else if spec.kind === 'json'}
        <textarea
          class="np-control-json"
          class:invalid={jsonError || missing}
          value={jsonDraft}
          placeholder={spec.shape ?? spec.type}
          oninput={(e) => setJson(e.currentTarget.value)}
        ></textarea>
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
    {@render actions()}
  </div>
{/if}

<style>
  .np-control {
    display: grid;
    grid-template-columns: var(--np-ws-cols, minmax(160px, 240px) minmax(0, 1fr) auto);
    gap: 4px 12px;
    align-items: start;
    padding: 6px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--np-border) 55%, transparent);
    min-width: 0;
  }

  .np-control-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .np-control-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--np-text-primary);
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

  .np-control-error {
    font-size: 11px;
    color: var(--np-danger);
  }

  .np-control-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
    padding: 3px 0;
  }

  .np-control-act {
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    padding: 4px 8px;
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

  .np-control-json.invalid {
    border-color: var(--np-danger);
  }
</style>
