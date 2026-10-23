<script lang="ts">
  import { theme } from '../framework/stores/theme'
  import DiagramViewport from './DiagramViewport.svelte'

  let { source }: { source: string } = $props()

  let svg = $state('')
  let error = $state('')
  let rendering = false

  async function render() {
    if (rendering) return
    rendering = true
    try {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({
        startOnLoad: false,
        theme: $theme === 'dark' ? 'dark' : 'default',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        securityLevel: 'loose',
        logLevel: 'error',
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis', padding: 20, nodeSpacing: 50, rankSpacing: 50 },
        sequence: { useMaxWidth: true, actorMargin: 60, boxMargin: 15, boxTextMargin: 8, noteMargin: 15, messageMargin: 40, mirrorActors: true, diagramMarginX: 30, diagramMarginY: 30 },
        gantt: { useMaxWidth: true, fontSize: 12 }
      })
      const id = `np-mermaid-${Math.floor(Math.random() * 1_000_000_000)}`
      svg = (await mermaid.render(id, source)).svg
      error = ''
    } catch (err) {
      error = String(err)
    } finally {
      rendering = false
    }
  }

  $effect(() => {
    $theme
    void render()
  })
</script>

<DiagramViewport kind="mermaid" {svg} {error} />
