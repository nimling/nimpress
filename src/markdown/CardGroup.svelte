<script lang="ts">
  import type { Snippet } from 'svelte'
  let { children, columns }: { children: Snippet; columns?: number } = $props()
</script>

<div class="np-cards-grid" style:grid-template-columns={columns ? `repeat(${columns}, minmax(0, 1fr))` : undefined}>
  {@render children()}
</div>

<style>
  .np-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin: 16px 0;
  }
</style>
