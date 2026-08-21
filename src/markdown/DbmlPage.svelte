<script lang="ts">
  import type { PageModule } from '../types'
  import { configStore, withBase } from '../framework/configStore'
  import FullscreenIcon from '../icons/FullscreenIcon.svelte'
  import IconDownload from '../icons/IconDownload.svelte'
  import DBMLBlock from './DBMLBlock.svelte'

  let { page }: { page: PageModule } = $props()

  type Align = 'start' | 'center' | 'end'

  interface HeaderAction {
    text: string
    link: string
    variant?: 'primary' | 'secondary' | 'ghost'
  }

  let block: DBMLBlock | undefined = $state()

  const config = $derived($configStore)
  const effectiveFooter = $derived(page.frontmatter.footer ?? config.footer)
  const data = $derived((page.frontmatter.data ?? {}) as Record<string, unknown>)
  const hasBody = $derived((page.html ?? '').trim().length > 0)
  const eyebrow = $derived(typeof data.eyebrow === 'string' ? data.eyebrow : '')
  const lead = $derived(typeof data.lead === 'string' ? data.lead : '')
  const logo = $derived(typeof data.logo === 'string' ? data.logo : '')
  const banner = $derived(typeof data.banner === 'string' ? data.banner : '')
  const align = $derived<Align>(
    data.align === 'center' || data.align === 'end' ? (data.align as Align) : 'start'
  )
  const height = $derived(typeof data.height === 'string' ? data.height : '')
  const actions = $derived(Array.isArray(data.actions) ? (data.actions as HeaderAction[]) : [])
  const downloadLabel = $derived(label(data.download, 'Download'))
  const fullscreenLabel = $derived(label(data.fullscreen, 'Fullscreen'))
  const fileName = $derived(page.dbmlFile || 'schema.dbml')

  function label(value: unknown, fallback: string): string {
    if (value === false) return ''
    if (typeof value === 'string' && value.trim()) return value.trim()
    return fallback
  }

  function download() {
    const source = page.dbmlSource ?? ''
    if (!source) return
    const url = URL.createObjectURL(new Blob([source], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }
</script>

<div class="np-dbml-page">
  <header class={`np-dbml-head np-dbml-head-${align}`} class:has-banner={!!banner}>
    {#if banner}
      <div class="np-dbml-banner" style:background-image={`url('${banner}')`}></div>
    {/if}
    <div class="np-dbml-head-inner">
      {#if logo}
        <img class="np-dbml-logo" src={logo} alt="" />
      {/if}
      {#if eyebrow}
        <p class="np-dbml-eyebrow">{eyebrow}</p>
      {/if}
      <h1 class="np-dbml-title">{page.frontmatter.title}</h1>
      {#if page.frontmatter.description}
        <p class="np-dbml-desc">{page.frontmatter.description}</p>
      {/if}
      {#if lead}
        <p class="np-dbml-lead">{lead}</p>
      {/if}
      {#if hasBody}
        <article class="np-prose np-dbml-prose">
          {@html page.html}
        </article>
      {/if}
      {#if downloadLabel || fullscreenLabel || actions.length}
        <div class="np-actions">
          {#if downloadLabel && page.dbmlSource}
            <button type="button" class="np-action np-action-primary" onclick={download}>
              <IconDownload />
              {downloadLabel}
            </button>
          {/if}
          {#if fullscreenLabel}
            <button
              type="button"
              class="np-action np-action-secondary"
              onclick={() => block?.toggleFullscreen()}
            >
              <FullscreenIcon size={15} title="" />
              {fullscreenLabel}
            </button>
          {/if}
          {#each actions as action, i (action.link || `action-${i}`)}
            <a href={withBase(action.link)} class={`np-action np-action-${action.variant ?? 'ghost'}`}>
              {action.text}
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </header>
  <div class="np-dbml-canvas" style:--np-dbml-page-height={height}>
    <DBMLBlock
      bind:this={block}
      schema={page.dbmlSchema ?? ''}
      error={page.dbmlError ?? ''}
      height="100%"
      activateOnMount
      flush
    />
  </div>
  {#if effectiveFooter}
    <footer class="np-dbml-footer">{effectiveFooter}</footer>
  {/if}
</div>

<style>
  .np-dbml-page {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    box-sizing: border-box;
  }
  .np-dbml-head {
    position: relative;
    padding: 72px 0 32px;
  }
  .np-dbml-head.has-banner {
    padding-top: 96px;
  }
  .np-dbml-banner {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0.18;
    pointer-events: none;
    mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
    z-index: 0;
  }
  .np-dbml-head-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: var(--np-content-max, 1024px);
    margin: 0 auto;
    padding: 0 32px;
    box-sizing: border-box;
  }
  .np-dbml-head-center .np-dbml-head-inner {
    text-align: center;
  }
  .np-dbml-head-center .np-actions {
    justify-content: center;
  }
  .np-dbml-head-end .np-dbml-head-inner {
    text-align: right;
  }
  .np-dbml-head-end .np-actions {
    justify-content: flex-end;
  }
  .np-dbml-logo {
    width: 56px;
    height: 56px;
    margin-bottom: 16px;
    border-radius: var(--np-radius-md);
  }
  .np-dbml-eyebrow {
    margin: 0 0 12px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 12px;
    font-weight: 700;
    color: var(--np-brand);
  }
  .np-dbml-title {
    margin: 0;
    font-size: 44px;
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.08;
    color: var(--np-brand);
  }
  .np-dbml-desc {
    margin: 12px 0 0;
    font-size: 20px;
    line-height: 1.45;
    color: var(--np-text-primary);
  }
  .np-dbml-lead {
    margin: 12px 0 0;
    font-size: 16px;
    line-height: 1.7;
    color: var(--np-text-secondary);
  }
  .np-dbml-prose {
    margin-top: 20px;
  }
  .np-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 28px 0 0;
  }
  .np-action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 22px;
    border-radius: var(--np-radius-md);
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    text-decoration: none;
    border: 1px solid transparent;
    cursor: pointer;
  }
  .np-action-primary {
    background-color: var(--np-brand);
    color: #fff;
  }
  .np-action-primary:hover {
    filter: brightness(1.05);
  }
  .np-action-secondary {
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
    border-color: var(--np-border);
  }
  .np-action-secondary:hover {
    border-color: var(--np-border-strong);
  }
  .np-action-ghost {
    background: transparent;
    color: var(--np-text-secondary);
  }
  .np-action-ghost:hover {
    color: var(--np-text-primary);
  }
  .np-dbml-canvas {
    width: 100%;
    height: var(--np-dbml-page-height, calc(100dvh - var(--np-header-height)));
    min-height: 480px;
    border-top: 1px solid var(--np-border);
    border-bottom: 1px solid var(--np-border);
    box-sizing: border-box;
  }
  .np-dbml-canvas :global(.np-dbml-wrapper) {
    height: 100%;
  }
  .np-dbml-footer {
    width: 100%;
    max-width: var(--np-content-max, 1024px);
    margin: 0 auto;
    padding: 24px 32px;
    box-sizing: border-box;
    text-align: center;
    color: var(--np-text-faint);
    font-size: 13px;
    white-space: pre-line;
  }
  @media (max-width: 1024px) {
    .np-dbml-head {
      padding-top: 48px;
    }
    .np-dbml-title {
      font-size: 34px;
    }
    .np-dbml-head-inner,
    .np-dbml-footer {
      padding-left: 20px;
      padding-right: 20px;
    }
  }
</style>
