<script lang="ts">
  import type { PageBody, PageShell } from '../types'
  import Page from './Page.svelte'

  let {
    page,
    bodyPromise
  }: {
    page: PageShell
    bodyPromise: Promise<{ default: PageBody }>
  } = $props()

  type Align = 'start' | 'end' | 'center'

  const data = $derived((page.frontmatter.data ?? {}) as Record<string, unknown>)
  const tagline = $derived(String(data.tagline ?? data.subtitle ?? page.frontmatter.description ?? ''))
  const lead = $derived(String(data.lead ?? ''))
  const image = $derived(typeof data.image === 'string' ? (data.image as string) : '')
  const logo = $derived(typeof data.logo === 'string' ? (data.logo as string) : '')
  const banner = $derived(typeof data.banner === 'string' ? (data.banner as string) : '')
  const eyebrow = $derived(typeof data.eyebrow === 'string' ? (data.eyebrow as string) : '')
  const align = $derived<Align>(
    data.align === 'end' || data.align === 'center' ? (data.align as Align) : 'start'
  )
  const sideBySide = $derived(!!image)
</script>

<section
  class={`np-hero np-hero-align-${align}`}
  class:np-hero-has-banner={!!banner}
  class:np-hero-side={sideBySide}
>
  {#if banner}
    <div class="np-hero-banner" style:background-image={`url('${banner}')`}></div>
  {/if}

  <div class="np-hero-inner">
    <div class="np-hero-copy">
      {#if logo}
        <img class="np-hero-logo" src={logo} alt="" />
      {/if}
      {#if eyebrow}
        <p class="np-hero-eyebrow">{eyebrow}</p>
      {/if}
      <h1 class="np-hero-title">{page.frontmatter.title}</h1>
      {#if tagline}
        <p class="np-hero-tagline">{tagline}</p>
      {/if}
      {#if lead}
        <p class="np-hero-lead">{lead}</p>
      {/if}
    </div>
    {#if image}
      <div class="np-hero-art">
        <img src={image} alt="" />
      </div>
    {/if}
  </div>
</section>

<div class="np-hero-body">
  {#await bodyPromise}
    <div class="np-page-loading" aria-busy="true"></div>
  {:then mod}
    <Page page={{ ...page, ...mod.default }} />
  {:catch err}
    <div class="np-page-error">Failed to load page body: {String(err)}</div>
  {/await}
</div>

<style>
  .np-hero {
    position: relative;
    width: calc(100% + 4em);
    max-width: none;
    margin: -2em -2em 0;
    padding: 13em 3em 0;
    box-sizing: border-box;
    display: block;
  }
  .np-hero-banner {
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
  .np-hero-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 80em;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 3em;
    align-items: center;
  }
  .np-hero-side .np-hero-inner {
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 60em) {
    .np-hero { padding: 7.5em 5em 0; }
    .np-hero-side .np-hero-inner {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      gap: 1.5em;
    }
    .np-hero-side.np-hero-align-end .np-hero-inner {
      direction: rtl;
    }
    .np-hero-side.np-hero-align-end .np-hero-copy,
    .np-hero-side.np-hero-align-end .np-hero-art {
      direction: ltr;
    }
  }

  .np-hero-align-start .np-hero-copy { text-align: left; align-items: flex-start; }
  .np-hero-align-end .np-hero-copy { text-align: left; align-items: flex-start; }
  .np-hero-align-center { text-align: center; }
  .np-hero-align-center .np-hero-copy {
    align-items: center;
    text-align: center;
    margin: 0 auto;
    max-width: 47.5em;
  }
  .np-hero-align-center .np-hero-lead { margin-left: auto; margin-right: auto; }

  .np-hero-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .np-hero-logo {
    width: 4em;
    height: 4em;
    margin-bottom: 1.25em;
    border-radius: var(--np-radius-md);
  }
  .np-hero-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75em;
    color: var(--np-brand);
    font-weight: 700;
    margin: 0 0 1.33em;
  }
  .np-hero-title {
    font-size: 3.5em;
    line-height: 1.05;
    font-weight: 800;
    letter-spacing: -0.025em;
    margin: 0 0 0.36em;
    color: var(--np-brand);
  }
  @media (min-width: 60em) {
    .np-hero-title { font-size: 4.75em; }
  }
  .np-hero-tagline {
    font-size: 1.5em;
    line-height: 1.35;
    color: var(--np-text-primary);
    margin: 0 0 0.5em;
    font-weight: 500;
  }
  .np-hero-lead {
    font-size: 1.0625em;
    line-height: 1.7;
    color: var(--np-text-secondary);
    margin: 0 0 1.4em;
    max-width: 60ch;
  }

  .np-hero-art {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
  }
  .np-hero-art img {
    width: 100%;
    max-width: 30em;
    height: auto;
    border-radius: var(--np-radius-lg);
  }

  .np-hero-body {
    margin-top: 1.5em;
  }
  .np-hero-body :global(.np-page) {
    padding-top: 0;
  }
</style>
