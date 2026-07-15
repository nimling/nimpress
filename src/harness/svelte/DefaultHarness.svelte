<script lang="ts">
  import ComponentHarness from './ComponentHarness.svelte'
  import ComponentHarnessEffects from './ComponentHarnessEffects.svelte'
  import ComponentHarnessOverlay from './ComponentHarnessOverlay.svelte'
  import ComponentStory from './ComponentStory.svelte'
</script>

<ComponentHarness>
  <ComponentHarnessEffects>
    <ComponentStory />
  </ComponentHarnessEffects>
  <ComponentHarnessOverlay />
</ComponentHarness>
