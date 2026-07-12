<script lang="ts">
  import type { ControlSpec } from '../types'
  import ControlNode from './ControlNode.svelte'

  let { spec, value, onchange }: { spec: ControlSpec; value: unknown; onchange: (value: unknown) => void } = $props()

  let jsonDraft = $state(value === undefined ? '' : JSON.stringify(value, null, 2))
  let jsonError = $state(false)

  const record = $derived(
    (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>
  )
  const rows = $derived(Array.isArray(value) ? (value as unknown[]) : [])
  const rowSpec = $derived(spec.item ? { ...spec.item, name: '' } : undefined)

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

{#snippet head()}
  {#if spec.name}
    <span class="np-control-name">
      <span class="np-control-label">
        {spec.name}{#if spec.required}<span class="np-control-required">*</span>{/if}
      </span>
      <code class="np-control-type" title={spec.shape ?? spec.type}>{spec.type}</code>
    </span>
    {#if spec.description}
      <span class="np-control-desc">{spec.description}</span>
    {/if}
  {/if}
{/snippet}

{#if spec.kind === 'object'}
  <div class="np-control np-control-kind-object">
    {@render head()}
    <div class="np-control-members">
      {#each spec.members ?? [] as member (member.name)}
        <ControlNode spec={member} value={record[member.name]} onchange={(v) => setMember(member.name, v)} />
      {/each}
    </div>
  </div>
{:else if spec.kind === 'array'}
  <div class="np-control np-control-kind-array">
    {@render head()}
    <div class="np-control-rows">
      {#each rows as row, i (i)}
        <div class="np-control-row">
          {#if rowSpec}
            <ControlNode spec={rowSpec} value={row} onchange={(v) => setRow(i, v)} />
          {/if}
          <button type="button" class="np-control-remove" title="remove item" onclick={() => removeRow(i)}>✕</button>
        </div>
      {/each}
      <button type="button" class="np-control-add" onclick={addRow}>add item</button>
    </div>
  </div>
{:else if spec.kind === 'boolean'}
  <label class="np-control np-control-kind-boolean">
    {@render head()}
    <input type="checkbox" checked={!!value} onchange={(e) => onchange(e.currentTarget.checked)} />
  </label>
{:else if spec.kind === 'number'}
  <label class="np-control np-control-kind-number">
    {@render head()}
    <input
      type="number"
      value={value ?? ''}
      oninput={(e) => onchange(e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))}
    />
  </label>
{:else if spec.kind === 'select'}
  <label class="np-control np-control-kind-select">
    {@render head()}
    <select
      value={String(value ?? '')}
      onchange={(e) => onchange(e.currentTarget.value === '' ? undefined : e.currentTarget.value)}
    >
      <option value=""></option>
      {#each spec.options ?? [] as option (option)}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </label>
{:else if spec.kind === 'json'}
  <label class="np-control np-control-kind-json">
    {@render head()}
    <textarea
      class="np-control-json"
      class:invalid={jsonError}
      value={jsonDraft}
      placeholder={spec.shape ?? spec.type}
      oninput={(e) => setJson(e.currentTarget.value)}
    ></textarea>
    {#if jsonError}
      <span class="np-control-error">invalid json, value not applied</span>
    {/if}
  </label>
{:else}
  <label class="np-control np-control-kind-{spec.kind}">
    {@render head()}
    <input
      type="text"
      value={String(value ?? '')}
      oninput={(e) => onchange(e.currentTarget.value === '' ? undefined : e.currentTarget.value)}
    />
  </label>
{/if}

<style>
  .np-control {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .np-control-name {
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

  .np-control-error {
    font-size: 11px;
    color: var(--np-danger);
  }

  .np-control input[type='text'],
  .np-control input[type='number'],
  .np-control select,
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

  .np-control input[type='checkbox'] {
    width: 15px;
    height: 15px;
    margin: 2px 0 0;
    align-self: flex-start;
    accent-color: var(--np-brand);
  }

  .np-control-json {
    font-family: var(--np-font-mono);
    font-size: 12px;
    min-height: 84px;
    resize: vertical;
  }

  .np-control-json.invalid {
    border-color: var(--np-danger);
  }

  .np-control-members {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 8px 0 8px 10px;
    border-left: 2px solid var(--np-border);
  }

  .np-control-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 0 8px 10px;
    border-left: 2px solid var(--np-border);
  }

  .np-control-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .np-control-row > :global(.np-control) {
    flex: 1;
  }

  .np-control-remove {
    font-size: 10px;
    line-height: 1;
    padding: 4px 6px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    color: var(--np-text-faint);
    cursor: pointer;
  }

  .np-control-remove:hover {
    color: var(--np-danger);
    border-color: var(--np-danger);
  }

  .np-control-add {
    align-self: flex-start;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: var(--np-radius-pill);
    border: 1px solid var(--np-border);
    background-color: var(--np-bg-surface);
    color: var(--np-text-secondary);
    cursor: pointer;
  }

  .np-control-add:hover {
    color: var(--np-text-primary);
    border-color: var(--np-text-faint);
  }
</style>
