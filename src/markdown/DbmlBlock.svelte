<script lang="ts">
  import { onMount } from 'svelte'
  import { theme } from '../framework/stores/theme'
  import FullscreenIcon from '../icons/FullscreenIcon.svelte'

  let {
    schema,
    error = '',
    height = '520px',
    activateOnMount = false
  }: { schema: string; error?: string; height?: string; activateOnMount?: boolean } = $props()

  let wrapper: HTMLDivElement
  let host = $state<HTMLDivElement | undefined>(undefined)
  let editor: HTMLElement | null = null
  let fullscreen = $state(false)
  let buildFailure = $state('')
  let activated = $state(false)

  const active = $derived(activateOnMount || activated)
  const failure = $derived(error || buildFailure)

  async function build() {
    if (!host || editor || error) return
    try {
      await import('@dineug/erd-editor')
      await customElements.whenDefined('erd-editor')
      const element = document.createElement('erd-editor') as HTMLElement & {
        readonly: boolean
        setInitialValue: (value: string) => void
        setPresetTheme: (options: Record<string, string>) => void
        destroy: () => void
      }
      element.style.cssText = 'display:block;width:100%;height:100%'
      host.appendChild(element)
      element.setInitialValue(schema)
      element.readonly = true
      editor = element
      applyTheme()
    } catch (err) {
      buildFailure = String(err)
    }
  }

  function applyTheme() {
    const element = editor as (HTMLElement & { setPresetTheme: (o: Record<string, string>) => void }) | null
    if (!element?.setPresetTheme) return
    element.setPresetTheme({
      appearance: $theme === 'dark' ? 'dark' : 'light',
      grayColor: 'slate',
      accentColor: 'bronze'
    })
  }

  async function toggleFullscreen() {
    if (!wrapper) return
    if (document.fullscreenElement === wrapper) {
      await document.exitFullscreen()
      fullscreen = false
    } else {
      await wrapper.requestFullscreen()
      fullscreen = true
    }
  }

  onMount(() => {
    void build()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) void toggleFullscreen()
    }
    const onFsChange = () => {
      fullscreen = document.fullscreenElement === wrapper
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFsChange)
      const element = editor as (HTMLElement & { destroy: () => void }) | null
      element?.destroy?.()
      editor = null
    }
  })

  $effect(() => {
    $theme
    applyTheme()
  })
</script>

<div
  class="np-dbml-wrapper"
  class:np-dbml-fullscreen={fullscreen}
  style:--np-dbml-height={height}
  bind:this={wrapper}
>
  {#if failure}
    <pre class="np-dbml-error">{failure}</pre>
  {:else}
    <div class="np-dbml-host" bind:this={host}></div>
    {#if active}
      <p class="np-dbml-hint">drag empty canvas or scroll to pan · ctrl scroll to zoom · minimap to jump</p>
    {:else}
      <button class="np-dbml-shield" type="button" onclick={() => (activated = true)}>
        <span class="np-dbml-shield-label">click to explore the schema</span>
      </button>
    {/if}
    <div class="np-dbml-toolbar" aria-label="Diagram controls">
      <button type="button" onclick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">
        <FullscreenIcon />
      </button>
    </div>
  {/if}
</div>

<style>
  .np-dbml-wrapper {
    position: relative;
    margin: 16px 0;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-surface);
    overflow: hidden;
    height: var(--np-dbml-height, 520px);
  }
  .np-dbml-fullscreen {
    margin: 0;
    border: 0;
    border-radius: 0;
    height: 100vh;
  }
  .np-dbml-host {
    position: absolute;
    inset: 0;
  }
  .np-dbml-error {
    margin: 0;
    padding: 16px;
    background-color: transparent;
    font-family: var(--np-font-mono);
    font-size: 12px;
    line-height: 1.6;
    color: var(--np-danger);
    white-space: pre-wrap;
    overflow: auto;
    height: 100%;
    box-sizing: border-box;
  }
  .np-dbml-shield {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0 0 20px;
    border: 0;
    background-color: color-mix(in srgb, var(--np-bg) 30%, transparent);
    cursor: pointer;
    font: inherit;
  }
  .np-dbml-shield:hover {
    background-color: color-mix(in srgb, var(--np-bg) 12%, transparent);
  }
  .np-dbml-shield-label {
    padding: 6px 14px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-pill);
    background-color: var(--np-bg-surface);
    color: var(--np-text-secondary);
    font-size: 12px;
    letter-spacing: 0.02em;
    box-shadow: var(--np-shadow-card);
  }
  .np-dbml-shield:hover .np-dbml-shield-label {
    color: var(--np-brand);
    border-color: var(--np-brand);
  }
  .np-dbml-shield:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: -2px;
  }
  .np-dbml-hint {
    position: absolute;
    bottom: 10px;
    left: 12px;
    margin: 0;
    z-index: 2;
    padding: 3px 8px;
    border-radius: var(--np-radius-sm);
    background-color: color-mix(in srgb, var(--np-bg-surface) 88%, transparent);
    color: var(--np-text-faint);
    font-size: 11px;
    letter-spacing: 0.02em;
    pointer-events: none;
  }
  .np-dbml-toolbar {
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    background-color: color-mix(in srgb, var(--np-bg-surface) 90%, transparent);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    padding: 4px;
    z-index: 2;
  }
  .np-dbml-toolbar button {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--np-text-secondary);
    border: 0;
    border-radius: var(--np-radius-sm);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0;
  }
  .np-dbml-toolbar button:hover {
    background-color: color-mix(in srgb, var(--np-brand) 14%, transparent);
    color: var(--np-brand);
  }
  .np-dbml-toolbar button:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 1px;
  }
</style>
