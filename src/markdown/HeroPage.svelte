<script lang="ts">
  import type { PageModule } from '../types'
  import Page from './Page.svelte'

  let { page }: { page: PageModule } = $props()

  interface HeroAction {
    text: string
    link: string
    variant?: 'primary' | 'secondary' | 'ghost'
  }

  interface HeroFeature {
    title: string
    details?: string
    icon?: string
    link?: string
  }

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
  const actions = $derived<HeroAction[]>(Array.isArray(data.actions) ? (data.actions as HeroAction[]) : [])
  const features = $derived<HeroFeature[]>(Array.isArray(data.features) ? (data.features as HeroFeature[]) : [])
  const hasBody = $derived(!!page.html && page.html.trim() !== '')
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
      {#if actions.length}
        <div class="np-hero-actions">
          {#each actions as a, i (a.link || `act-${i}`)}
            <a href={a.link} class={`np-hero-btn np-hero-btn-${a.variant ?? 'primary'}`}>{a.text}</a>
          {/each}
        </div>
      {/if}
    </div>
    {#if image}
      <div class="np-hero-art">
        <img src={image} alt="" />
      </div>
    {/if}
  </div>

  {#if features.length}
    <div class="np-hero-features">
      {#each features as f, i (f.title || `f-${i}`)}
        <svelte:element
          this={f.link ? 'a' : 'div'}
          class="np-hero-feature"
          href={f.link}
        >
          {#if f.icon}<span class="np-hero-feature-icon">{f.icon}</span>{/if}
          <div class="np-hero-feature-body">
            <h3>{f.title}</h3>
            {#if f.details}<p>{f.details}</p>{/if}
          </div>
        </svelte:element>
      {/each}
    </div>
  {/if}
</section>

{#if hasBody}
  <div class="np-hero-body">
    <Page {page} />
  </div>
{:else if page.frontmatter.footer}
  <footer class="np-hero-footer">{page.frontmatter.footer}</footer>
{/if}

<div class="np-hero-tail"></div>

<style>
  .np-hero {
    position: relative;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 64px 32px 80px;
    box-sizing: border-box;
  }
  .np-hero-banner {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0.18;
    pointer-events: none;
    mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
    z-index: 0;
  }
  .np-hero-inner {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 48px;
    align-items: center;
  }
  .np-hero-side .np-hero-inner {
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 960px) {
    .np-hero {
      padding: 112px 56px 112px;
    }
    .np-hero-side .np-hero-inner {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      gap: 64px;
    }
    .np-hero-side.np-hero-align-end .np-hero-inner {
      direction: rtl;
    }
    .np-hero-side.np-hero-align-end .np-hero-copy,
    .np-hero-side.np-hero-align-end .np-hero-art {
      direction: ltr;
    }
  }

  .np-hero-align-start .np-hero-copy {
    text-align: left;
    align-items: flex-start;
  }
  .np-hero-align-end .np-hero-copy {
    text-align: left;
    align-items: flex-start;
  }
  .np-hero-align-center {
    text-align: center;
  }
  .np-hero-align-center .np-hero-copy {
    align-items: center;
    text-align: center;
    margin: 0 auto;
    max-width: 760px;
  }
  .np-hero-align-center .np-hero-actions { justify-content: center; }
  .np-hero-align-center .np-hero-lead { margin-left: auto; margin-right: auto; }

  .np-hero-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .np-hero-logo {
    width: 64px;
    height: 64px;
    margin-bottom: 20px;
    border-radius: var(--np-radius-md);
  }
  .np-hero-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 12px;
    color: var(--np-brand);
    font-weight: 700;
    margin: 0 0 16px;
  }

  .np-hero-title {
    font-size: 56px;
    line-height: 1.05;
    font-weight: 800;
    letter-spacing: -0.025em;
    margin: 0 0 20px;
    color: var(--np-brand);
  }
  @media (min-width: 960px) {
    .np-hero-title { font-size: 76px; }
  }
  .np-hero-tagline {
    font-size: 24px;
    line-height: 1.35;
    color: var(--np-text-primary);
    margin: 0 0 12px;
    font-weight: 500;
  }
  .np-hero-lead {
    font-size: 17px;
    line-height: 1.7;
    color: var(--np-text-secondary);
    margin: 0 0 32px;
    max-width: 60ch;
  }
  .np-hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 24px;
  }
  .np-hero-btn {
    display: inline-flex;
    align-items: center;
    height: 44px;
    padding: 0 22px;
    border-radius: var(--np-radius-md);
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    border: 1px solid transparent;
  }
  .np-hero-btn-primary {
    background-color: var(--np-brand);
    color: #fff;
  }
  .np-hero-btn-primary:hover {
    background-color: var(--np-brand-hover, var(--np-brand));
    filter: brightness(1.05);
  }
  .np-hero-btn-secondary {
    background-color: var(--np-bg-surface);
    color: var(--np-text-primary);
    border-color: var(--np-border);
  }
  .np-hero-btn-secondary:hover { border-color: var(--np-border-strong); }
  .np-hero-btn-ghost {
    background: transparent;
    color: var(--np-text-secondary);
  }
  .np-hero-btn-ghost:hover { color: var(--np-text-primary); }

  .np-hero-art {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
  }
  .np-hero-art img {
    width: 100%;
    max-width: 480px;
    height: auto;
    border-radius: var(--np-radius-lg);
  }

  .np-hero-features {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-top: 72px;
  }
  .np-hero-feature {
    display: flex;
    gap: 16px;
    padding: 22px;
    border-radius: var(--np-radius-lg);
    background-color: var(--np-bg-card);
    border: 1px solid var(--np-border);
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  a.np-hero-feature:hover {
    border-color: var(--np-brand);
    transform: translateY(-2px);
  }
  .np-hero-feature-icon {
    font-size: 24px;
    line-height: 1;
    flex: 0 0 auto;
  }
  .np-hero-feature-body { min-width: 0; }
  .np-hero-feature-body h3 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
    color: var(--np-text-primary);
  }
  .np-hero-feature-body p {
    margin: 0;
    color: var(--np-text-secondary);
    font-size: 14px;
    line-height: 1.55;
  }

  .np-hero-body {
    margin-top: 80px;
  }
  .np-hero-footer {
    margin: 96px auto 0;
    max-width: 720px;
    text-align: center;
    color: var(--np-text-faint);
    font-size: 13px;
    padding: 32px 24px 0;
    border-top: 1px solid var(--np-divider);
    white-space: pre-line;
  }
  .np-hero-tail {
    height: 25vh;
    min-height: 160px;
  }
</style>
