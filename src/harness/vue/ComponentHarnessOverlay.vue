<script lang="ts">
import { defineComponent, h } from 'vue'
import { useHarness } from './context'

export default defineComponent({
  name: 'ComponentHarnessOverlay',
  setup() {
    const ctx = useHarness()
    return () => (ctx.overlay.value ? h(ctx.overlay.value) : null)
  },
})
</script>
