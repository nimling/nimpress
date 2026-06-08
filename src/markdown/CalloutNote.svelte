<script lang="ts">
  import type { Snippet } from 'svelte'
  let { title = 'Note', children }: { title?: string; children: Snippet } = $props()
</script>

<div class="np-callout np-callout-note">
  <div class="np-callout-body">
    <div class="np-callout-title">{title}</div>
    {@render children()}
  </div>
</div>
