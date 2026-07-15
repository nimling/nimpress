<script lang="ts">
import { defineComponent, h } from 'vue'
import { useHarness } from './context'

export default defineComponent({
  name: 'ComponentStory',
  setup() {
    const ctx = useHarness()
    return () => {
      const target = ctx.component.value
      if (!target) return null
      return h(target, ctx.props.value, ctx.slots.value)
    }
  },
})
</script>
