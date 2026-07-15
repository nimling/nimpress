<script lang="ts">
  import type { Snippet } from 'svelte'
  import ComponentHarness from './ComponentHarness.svelte'
  import ComponentHarnessEffects from './ComponentHarnessEffects.svelte'
  import ComponentHarnessOverlay from './ComponentHarnessOverlay.svelte'

  let { children }: { children?: Snippet } = $props()
</script>

<ComponentHarness>
  <ComponentHarnessEffects>
    {@render children?.()}
  </ComponentHarnessEffects>
  <ComponentHarnessOverlay />
</ComponentHarness>
