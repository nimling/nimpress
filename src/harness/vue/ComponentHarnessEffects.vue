<script lang="ts">
import { computed, defineComponent, h } from 'vue'
import { useHarness } from './context'

export default defineComponent({
  name: 'ComponentHarnessEffects',
  setup(_, { slots }) {
    const ctx = useHarness()
    const cls = computed(() => ['nimpress-harness-effects', { 'nimpress-harness-shadow': ctx.shadow.value }])
    return () => h('div', { class: cls.value }, slots.default?.())
  },
})
</script>

<style>
.nimpress-harness-effects {
  display: contents;
}

.nimpress-harness-shadow > * {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}

[data-theme='dark'] .nimpress-harness-shadow > * {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.09);
}
</style>
