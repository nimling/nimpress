<script lang="ts">
  import { withBase } from '../framework/configStore'
  import RoadmapBlob from './RoadmapBlob.svelte'
  import type { RoadmapCard, RoadmapKind } from '../types'

  let {
    entry,
    variant = 'card',
    straight = false,
    order = 0,
    side,
    col,
    row,
    cols,
    rows,
    onClick,
    onEnter,
    onLeave
  }: {
    entry: RoadmapCard
    variant?: 'card' | 'compact' | 'small' | 'pill'
    straight?: boolean
    order?: number
    side: 'left' | 'right'
    col: number
    row: number
    cols: number
    rows: number
    onClick: (e: MouseEvent) => void
    onEnter: (e: Event) => void
    onLeave: () => void
  } = $props()

  function kindLabel(kind: RoadmapKind): string {
    return kind.toUpperCase()
  }

  function formatDate(iso: string | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const year = d.getUTCFullYear()
    return `${day}.${month}.${year}`
  }

  const banner = $derived((entry.data as Record<string, unknown> | undefined)?.banner as string | undefined)
</script>

<a
  class="np-rm-node np-rm-node-{variant} np-rm-node-{side} np-rm-node-{entry.kind} np-rm-node-{entry.status}"
  href={withBase(entry.href)}
  id={entry.slug}
  style:grid-column={`${col + 1} / span ${cols}`}
  style:grid-row={`${row + 1} / span ${rows}`}
  style:--np-rm-order={order}
  onclick={(e) => onClick(e)}
  onmouseenter={onEnter}
  onmouseleave={onLeave}
  onfocus={onEnter}
  onblur={onLeave}
>
  {#if variant !== 'pill'}
    <span class="np-rm-node-kind">{kindLabel(entry.kind)}</span>
  {/if}
  <span class="np-rm-node-body" style:inset={`${((1 - 1 / (Math.pow(2, 1 / (straight ? 8 : 4)) + 0.05)) / 2 * 100).toFixed(2)}%`}>
    <RoadmapBlob
      seed={entry.slug}
      {banner}
      stroke="var(--np-rm-kind)"
      strokeWidth={entry.status === 'planned' ? 1.5 : 2.4}
      squareness={straight ? 8 : 4}
      wobble={straight ? 0 : 0.025}
      points={28}
    />
    {#if variant === 'pill'}
      <span class="np-rm-node-pill">
        {#if entry.targetDate}
          <span class="np-rm-node-date">{formatDate(entry.targetDate)}</span>
        {/if}
        <span class="np-rm-node-pill-title">{entry.title}</span>
      </span>
    {:else}
      <span class="np-rm-node-inner">
        <span class="np-rm-node-head">
          <span class="np-rm-node-meta">
            {#if entry.targetDate}
              <span class="np-rm-node-date">{formatDate(entry.targetDate)}</span>
            {/if}
          </span>
        </span>
        <span class="np-rm-node-title">{entry.title}</span>
        {#if entry.description && variant === 'card'}
          <span class="np-rm-node-desc">{entry.description}</span>
        {/if}
      </span>
    {/if}
  </span>
</a>

<style>
  .np-rm-node {
    --np-rm-kind: var(--np-brand);
    font-size: calc(100cqi / 96);
    position: relative;
    display: block;
    min-width: 0;
    min-height: 0;
    text-decoration: none;
    color: var(--np-text-primary);
    cursor: pointer;
    transition: transform 0.18s ease, filter 0.18s ease;
    z-index: 2;
  }
  .np-rm-node-epic { --np-rm-kind: var(--np-info); }
  .np-rm-node-feature { --np-rm-kind: var(--np-check); }
  .np-rm-node-bug { --np-rm-kind: var(--np-danger); }
  .np-rm-node:hover { transform: translateY(-2px); filter: brightness(1.04); }
  .np-rm-node:focus-visible { outline: 2px solid var(--np-brand); outline-offset: 4px; border-radius: var(--np-radius-lg); }
  .np-rm-node-body {
    position: absolute;
    inset: 9.6%;
    display: flex;
    align-items: center;
    container-type: size;
  }
  .np-rm-node-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.35em;
    width: 100%;
    height: 100%;
    overflow: hidden;
    text-align: left;
  }
  .np-rm-node-head {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.6em;
    font-size: 0.85em;
  }
  .np-rm-node-kind {
    position: absolute;
    top: 3%;
    left: 12%;
    z-index: 3;
    transform: translateY(-50%);
    font-size: 0.8em;
    display: inline-flex;
    align-items: center;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    line-height: 1;
    padding: 0.3em 0.8em;
    border-radius: var(--np-radius-pill);
    color: var(--np-text-on-brand);
    background-color: var(--np-rm-kind);
  }
  .np-rm-node-date {
    font-family: var(--np-font-mono);
    color: var(--np-text-muted);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .np-rm-node-title {
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.01em;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-size: 1.5em;
  }
  .np-rm-node-desc {
    line-height: 1.45;
    color: var(--np-text-secondary);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
    font-size: 1.1em;
  }
  .np-rm-node-compact .np-rm-node-kind { font-size: 0.72em; }
  .np-rm-node-small .np-rm-node-kind { font-size: 0.65em; }
  .np-rm-node-compact .np-rm-node-title { font-size: 1.2em; }
  .np-rm-node-small .np-rm-node-title { font-size: 1.05em; -webkit-line-clamp: 1; }
  .np-rm-node-small .np-rm-node-head { font-size: 0.72em; }
  .np-rm-node-pill {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.2em;
    width: 100%;
    text-align: left;
  }
  .np-rm-node-pill .np-rm-node-date { font-size: 0.75em; }
  .np-rm-node-pill-title {
    max-width: 100%;
    font-size: 1.05em;
    font-weight: 600;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 800px) {
    .np-rm-node { font-size: 12px; }
  }
</style>
