<script lang="ts">
  import type { Snippet } from 'svelte'
  let { title = 'Info', children }: { title?: string; children: Snippet } = $props()
</script>

<div class="np-callout np-callout-info">
  <div class="np-callout-body">
    <div class="np-callout-title">{title}</div>
    {@render children()}
  </div>
</div>
