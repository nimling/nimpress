<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    columns = 0
  }: {
    children: Snippet
    columns?: number
  } = $props()
</script>

<div
  class="np-features-grid"
  style:grid-template-columns={columns > 0
    ? `repeat(${columns}, minmax(0, 1fr))`
    : 'repeat(auto-fit, minmax(240px, 1fr))'}
>
  {@render children()}
</div>

<style>
  .np-features-grid {
    display: grid;
    gap: 16px;
    margin: 24px 0;
  }
</style>
