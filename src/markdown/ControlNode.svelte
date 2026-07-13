<script module lang="ts">
  import type { ControlSpec } from '../types'

  const swCharacters = ['Luke Skywalker', 'Leia Organa', 'Han Solo', 'Obi-Wan Kenobi', 'Ahsoka Tano', 'Lando Calrissian', 'Din Djarin', 'Padmé Amidala']
  const swPlaces = ['Tatooine', 'Coruscant', 'Endor', 'Hoth', 'Naboo', 'Dagobah', 'Mos Eisley', 'Bespin']
  const swThings = ['Millennium Falcon', 'X-Wing', 'Razor Crest', 'Lightsaber', 'Holocron', 'Beskar Ingot', 'Astromech Droid', 'Sarlacc Pit']
  const swSentences = [
    'Bantha fodder drifts across the dune sea beyond Mos Eisley.',
    'A hyperdrive hums softly as the freighter clears the asteroid field.',
    'Womp rats scatter when the landspeeder skims Beggar’s Canyon.',
    'The council convened on Coruscant to debate the blockade of Naboo.',
    'Moisture vaporators line the ridge above the homestead on Tatooine.',
    'A protocol droid recites etiquette while the astromech beeps in protest.',
    'Snow swirls over the shield generator on the plains of Hoth.',
    'The cantina band strikes up as smugglers haggle over spice.'
  ]
  const swWords = ['bantha', 'kyber', 'hyperdrive', 'womp-rat', 'sabacc', 'holocron', 'beskar', 'porg']
  const swEmails = ['leia.organa@rebellion.org', 'luke.skywalker@jedi.temple', 'han.solo@falcon.crew', 'ahsoka.tano@fulcrum.net']
  const swColors = ['#ffe81f', '#2e67f8', '#e5484d', '#30a46c', '#8a63d2']

  function hintHash(text: string): number {
    let h = 0
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
    return h
  }

  function pick(list: string[], hint: string, seed: number): string {
    return list[(hintHash(hint) + seed) % list.length]
  }

  function mockNumber(hint: string): number {
    if (/count|total|amount|quantity/.test(hint)) return 7
    if (/index|offset|position/.test(hint)) return 0
    if (/width/.test(hint)) return 320
    if (/height/.test(hint)) return 240
    if (/size|length/.test(hint)) return 42
    if (/price|cost/.test(hint)) return 199
    if (/duration|timeout|delay|interval|ms/.test(hint)) return 300
    if (/year/.test(hint)) return 1977
    if (/age/.test(hint)) return 29
    if (/min/.test(hint)) return 0
    if (/max|limit/.test(hint)) return 100
    if (/percent|progress|opacity/.test(hint)) return 66
    return 42
  }

  function mockText(hint: string, seed: number): string {
    if (/email/.test(hint)) return pick(swEmails, hint, seed)
    if (/url|link|href|website/.test(hint)) return `https://holonet.example/${pick(swWords, hint, seed)}`
    if (/image|avatar|photo|thumbnail|src|poster/.test(hint)) return `https://holonet.example/${pick(swWords, hint, seed)}.png`
    if (/icon/.test(hint)) return 'pi pi-star'
    if (/color/.test(hint)) return pick(swColors, hint, seed)
    if (/date/.test(hint)) return '1977-05-25'
    if (/time/.test(hint)) return '09:41'
    if (/phone|tel/.test(hint)) return '+47 555 01138'
    if (/id|uuid|key|slug/.test(hint)) return `${pick(swWords, hint, seed)}-1138`
    if (/user|author|owner|person|assignee|member/.test(hint)) return pick(swCharacters, hint, seed)
    if (/city|place|location|address/.test(hint)) return pick(swPlaces, hint, seed)
    if (/title|name|label|heading|summary/.test(hint)) return pick(swThings, hint, seed)
    if (/description|text|content|detail|body|paragraph|message|caption|placeholder/.test(hint)) return pick(swSentences, hint, seed)
    if (/keyword|tag|word|category|group/.test(hint)) return pick(swWords, hint, seed)
    return pick(swThings, hint, seed)
  }

  export function mockValue(spec: ControlSpec, seed = 0): unknown {
    const hint = `${spec.name} ${spec.description ?? ''}`.toLowerCase()
    if (spec.kind === 'select') return spec.options?.[(hintHash(hint) + seed) % (spec.options.length || 1)]
    if (spec.kind === 'boolean') return true
    if (spec.kind === 'number') return mockNumber(hint)
    if (spec.kind === 'text' || spec.kind === 'slot') return mockText(hint, seed)
    if (spec.kind === 'object') {
      const out: Record<string, unknown> = {}
      for (const member of spec.members ?? []) {
        const v = mockValue(member, seed)
        if (v !== undefined) out[member.name] = v
      }
      return Object.keys(out).length ? out : undefined
    }
    if (spec.kind === 'array') {
      if (!spec.item) return undefined
      const first = mockValue(spec.item, seed)
      if (first === undefined) return undefined
      return [first, mockValue(spec.item, seed + 1)]
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

  function clearSelf() {
    jsonDraft = ''
    jsonError = false
    onchange(undefined)
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
    <button type="button" class="np-control-act" title="clear this input" onclick={clearSelf}>clear</button>
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
