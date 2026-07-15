<script lang="ts">
  import type { Component } from 'svelte'
  import { setHarness, type HarnessContext } from './context.svelte'
  import ComponentStory from './ComponentStory.svelte'

  let {
    ctx,
    harness: Harness,
    storyHarness: StoryHarness
  }: { ctx: HarnessContext; harness: Component; storyHarness?: Component } = $props()
  setHarness(ctx)
</script>

<Harness>
  {#if StoryHarness}
    <StoryHarness>
      <ComponentStory />
    </StoryHarness>
  {:else}
    <ComponentStory />
  {/if}
</Harness>
