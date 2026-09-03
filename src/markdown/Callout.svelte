<script lang="ts">
  import type { Snippet } from 'svelte'

  type CalloutType =
    | 'tip' | 'note' | 'warning' | 'info' | 'check'
    | 'abstract' | 'success' | 'question' | 'failure' | 'danger' | 'bug' | 'example' | 'quote'

  let {
    type = 'note',
    title,
    collapsible = false,
    open = false,
    inline,
    children
  }: {
    type?: CalloutType
    title?: string
    collapsible?: boolean
    open?: boolean
    inline?: 'start' | 'end'
    children: Snippet
  } = $props()

  const defaultTitle = $derived(type[0].toUpperCase() + type.slice(1))
  const label = $derived(title === undefined ? defaultTitle : title)
  const classes = $derived(
    `np-callout np-callout-${type}${collapsible ? ' np-callout-collapsible' : ''}${inline ? ` np-callout-inline np-callout-inline-${inline}` : ''}`
  )
</script>

{#if collapsible}
  <details class={classes} {open}>
    <summary class="np-callout-title">{label || defaultTitle}</summary>
    <div class="np-callout-body">
      {@render children()}
    </div>
  </details>
{:else}
  <div class={classes}>
    <div class="np-callout-body">
      {#if label}
        <div class="np-callout-title">{label}</div>
      {/if}
      {@render children()}
    </div>
  </div>
{/if}
