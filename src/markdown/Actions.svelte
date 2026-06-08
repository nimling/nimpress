<script lang="ts">
  interface ActionItem {
    text: string
    link: string
    variant?: 'primary' | 'secondary' | 'ghost'
  }

  let {
    items = [],
    align = 'start'
  }: {
    items: ActionItem[]
    align?: 'start' | 'center' | 'end'
  } = $props()
</script>

<div class={`np-actions np-actions-${align}`}>
  {#each items as a, i (a.link || `act-${i}`)}
    <a
      href={a.link}
      class={`np-action np-action-${a.variant ?? 'primary'}`}
    >
      {a.text}
    </a>
  {/each}
</div>

<style>
  .np-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 24px 0;
  }
  .np-actions-start { justify-content: flex-start; }
  .np-actions-center { justify-content: center; }
  .np-actions-end { justify-content: flex-end; }

  .np-action {
    display: inline-flex;
    align-items: center;
    height: 44px;
    padding: 0 22px;
    border-radius: var(--np-radius-md);
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    border: 1px solid transparent;
  }
  .np-action-primary {
    background-color: var(--np-brand);
    color: #fff;
  }
  .np-action-primary:hover { filter: brightness(1.05); }
  .np-action-secondary {
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
    border-color: var(--np-border);
  }
  .np-action-secondary:hover { border-color: var(--np-border-strong); }
  .np-action-ghost {
    background: transparent;
    color: var(--np-text-secondary);
  }
  .np-action-ghost:hover { color: var(--np-text-primary); }
</style>
