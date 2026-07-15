<script setup lang="ts">
import ComponentHarness from './ComponentHarness.vue'
import ComponentHarnessEffects from './ComponentHarnessEffects.vue'
import ComponentHarnessOverlay from './ComponentHarnessOverlay.vue'
</script>

<template>
  <ComponentHarness>
    <ComponentHarnessEffects>
      <slot />
    </ComponentHarnessEffects>
    <ComponentHarnessOverlay />
  </ComponentHarness>
</template>
