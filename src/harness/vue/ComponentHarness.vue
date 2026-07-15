<script lang="ts">
import { defineComponent, h } from 'vue'

export default defineComponent({
  name: 'ComponentHarness',
  setup(_, { slots }) {
    return () => h('div', { class: 'nimpress-harness' }, slots.default?.())
  },
})
</script>

<style>
.nimpress-harness {
  display: contents;
}
</style>
