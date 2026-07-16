<script lang="ts">
  import { theme } from '../framework/stores/theme'

  let {
    route = '/_components',
    system = '',
    component = '',
    story = '',
    props = undefined,
    slots = undefined,
    height = '20em'
  }: {
    route?: string
    system?: string
    component?: string
    story?: string
    props?: Record<string, unknown>
    slots?: Record<string, string>
    height?: string
  } = $props()

  let frame: HTMLIFrameElement | undefined = $state()

  function encode(value: unknown): string {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    } catch {
      return ''
    }
  }

  const src = $derived.by(() => {
    if (!system || !component) return ''
    const params = new URLSearchParams()
    if (story) params.set('story', story)
    if (props) params.set('props', encode(props))
    if (slots) params.set('slots', encode(slots))
    params.set('theme', $theme)
    const query = params.toString()
    return `${route}/${encodeURIComponent(system)}/${encodeURIComponent(component)}/${query ? `?${query}` : ''}`
  })

  $effect(() => {
    frame?.contentWindow?.postMessage({ type: 'nimpress:props', theme: $theme }, '*')
  })
</script>

{#if src}
  <div class="np-component-embed-host" style:height>
    <iframe bind:this={frame} {src} title={component} loading="lazy"></iframe>
  </div>
{:else}
  <div class="np-component-embed-missing">component embed needs a system and a component name</div>
{/if}

<style>
  .np-component-embed-host {
    width: 100%;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    overflow: hidden;
    background-color: var(--np-bg-surface);
    background-image:
      linear-gradient(45deg, color-mix(in srgb, var(--np-border) 35%, transparent) 25%, transparent 25%),
      linear-gradient(-45deg, color-mix(in srgb, var(--np-border) 35%, transparent) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, color-mix(in srgb, var(--np-border) 35%, transparent) 75%),
      linear-gradient(-45deg, transparent 75%, color-mix(in srgb, var(--np-border) 35%, transparent) 75%);
    background-size: 1.25em 1.25em;
    background-position: 0 0, 0 0.625em, 0.625em -0.625em, -0.625em 0;
    margin: 1.5em 0;
  }
  .np-component-embed-host iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
  .np-component-embed-missing {
    border: 1px dashed var(--np-border);
    border-radius: var(--np-radius-md);
    padding: 1em;
    color: var(--np-text-muted);
    font-size: 0.85em;
  }
</style>
