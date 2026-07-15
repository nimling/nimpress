<script setup lang="ts">
import ComponentHarness from './ComponentHarness.vue'
import ComponentHarnessEffects from './ComponentHarnessEffects.vue'
import ComponentHarnessOverlay from './ComponentHarnessOverlay.vue'
import ComponentStory from './ComponentStory.vue'
</script>

<template>
  <ComponentHarness>
    <ComponentHarnessEffects>
      <ComponentStory />
    </ComponentHarnessEffects>
    <ComponentHarnessOverlay />
  </ComponentHarness>
</template>
