<script lang="ts">
  import type { PageBody, PageElement, PageShell } from '../types'
  import { withBase } from '../framework/configStore'
  import Page from './Page.svelte'

  let {
    page,
    bodyPromise
  }: {
    page: PageShell
    bodyPromise: Promise<{ default: PageBody }>
  } = $props()

  type Align = 'start' | 'center'

  const data = $derived((page.frontmatter.data ?? {}) as Record<string, unknown>)
  const tagline = $derived(String(data.tagline ?? page.frontmatter.description ?? ''))
  const lead = $derived(String(data.lead ?? ''))
  const logo = $derived(typeof data.logo === 'string' ? (data.logo as string) : '')
  const background = $derived(typeof data.background === 'string' ? (data.background as string) : page.frontmatter.background ?? '')
  const eyebrow = $derived(typeof data.eyebrow === 'string' ? (data.eyebrow as string) : '')
  const align = $derived<Align>(data.align === 'start' ? 'start' : 'center')
  const contentWidth = $derived(data.width === 'content')
  const hide = $derived<PageElement[]>(Array.from(new Set<PageElement>(['toc', 'footer', ...(page.frontmatter.hide ?? [])])))
</script>

<div class="np-fullpage" class:np-fullpage-content={contentWidth}>
  <section class={`np-fullpage-band np-fullpage-align-${align}`} class:np-fullpage-has-banner={!!background}>
    {#if background}
      <div class="np-fullpage-banner" style:background-image={`url('${withBase(background)}')`}></div>
    {/if}
    <div class="np-fullpage-inner">
      <div class="np-fullpage-copy">
        {#if logo}
          <img class="np-fullpage-logo" src={withBase(logo)} alt="" />
        {/if}
        {#if eyebrow}
          <p class="np-fullpage-eyebrow">{eyebrow}</p>
        {/if}
        <h1 class="np-fullpage-title">{page.frontmatter.title}</h1>
        {#if tagline}
          <p class="np-fullpage-tagline">{tagline}</p>
        {/if}
        {#if lead}
          <p class="np-fullpage-lead">{lead}</p>
        {/if}
      </div>
    </div>
  </section>

  <div class="np-fullpage-body">
    {#await bodyPromise}
      <div class="np-page-loading" aria-busy="true"></div>
    {:then mod}
      <Page page={{ ...page, ...mod.default, frontmatter: { ...page.frontmatter, hide } }} />
    {:catch err}
      <div class="np-page-error">Failed to load page body: {String(err)}</div>
    {/await}
  </div>
</div>

<style>
  .np-fullpage {
    width: 100%;
    min-height: 100%;
  }
  .np-fullpage-band {
    position: relative;
    padding: 6em 2em 3em;
    box-sizing: border-box;
    overflow: hidden;
  }
  .np-fullpage-banner {
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
  .np-fullpage-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 80em;
    margin: 0 auto;
  }
  .np-fullpage-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
    max-width: 47.5em;
  }
  .np-fullpage-align-center .np-fullpage-copy {
    align-items: center;
    text-align: center;
    margin: 0 auto;
  }
  .np-fullpage-align-start .np-fullpage-copy {
    align-items: flex-start;
    text-align: left;
  }
  .np-fullpage-logo {
    width: 4em;
    height: 4em;
    margin-bottom: 1.25em;
    border-radius: var(--np-radius-md);
  }
  .np-fullpage-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75em;
    color: var(--np-brand);
    font-weight: 700;
    margin: 0 0 1em;
  }
  .np-fullpage-title {
    font-size: clamp(2.5em, 6vw, 4.5em);
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-weight: 800;
    margin: 0 0 0.35em;
    color: var(--np-text-primary);
  }
  .np-fullpage-tagline {
    font-size: clamp(1.15em, 2.2vw, 1.5em);
    line-height: 1.4;
    color: var(--np-text-muted);
    margin: 0;
  }
  .np-fullpage-lead {
    font-size: 1.05em;
    line-height: 1.6;
    color: var(--np-text-muted);
    margin: 1.25em 0 0;
  }
  @media (min-width: 60em) {
    .np-fullpage-band {
      padding: 8em 5em 4em;
    }
  }
  .np-fullpage-body :global(.np-page) {
    max-width: none;
    padding-top: 0;
  }
  .np-fullpage-body :global(.np-page-shell) {
    padding: 0 2em;
    box-sizing: border-box;
  }
  .np-fullpage-content .np-fullpage-body :global(.np-page) {
    max-width: var(--np-content-max, 1024px);
  }
  @media (min-width: 60em) {
    .np-fullpage-body :global(.np-page-shell) {
      padding: 0 5em;
    }
  }
</style>
