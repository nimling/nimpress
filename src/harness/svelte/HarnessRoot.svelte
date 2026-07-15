<script lang="ts">
  import type { Component } from 'svelte'
  import { setHarness, type HarnessContext } from './context.svelte'

  let { ctx, harness: Harness }: { ctx: HarnessContext; harness: Component } = $props()
  setHarness(ctx)
</script>

<Harness />
