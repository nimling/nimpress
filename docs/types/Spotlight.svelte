<script lang="ts">
  import { Page } from '@nimtech/nimpress'
  import type { PageModule } from '@nimtech/nimpress'

  let { page }: { page: PageModule } = $props()

  const data = $derived((page.frontmatter.data ?? {}) as Record<string, unknown>)
  const kicker = $derived(typeof data.kicker === 'string' ? (data.kicker as string) : '')
  const accent = $derived(typeof data.accent === 'string' ? (data.accent as string) : 'var(--np-brand)')
</script>

<div class="spotlight" style:--spotlight-accent={accent}>
  <header class="spotlight-band">
    {#if kicker}<p class="spotlight-kicker">{kicker}</p>{/if}
    <h1 class="spotlight-title">{page.frontmatter.title}</h1>
    {#if page.frontmatter.description}<p class="spotlight-lead">{page.frontmatter.description}</p>{/if}
  </header>
  <Page {page} />
</div>

<style>
  .spotlight-band {
    max-width: var(--np-content-max, 1024px);
    margin: 0 auto;
    padding: 96px 32px 0;
    box-sizing: border-box;
    border-left: 6px solid var(--spotlight-accent);
  }
  .spotlight-kicker {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--spotlight-accent);
  }
  .spotlight-title {
    margin: 8px 0 0;
    font-size: clamp(2em, 5vw, 3.25em);
    line-height: 1.1;
    color: var(--np-text-primary);
  }
  .spotlight-lead {
    margin: 12px 0 0;
    font-size: 1.1em;
    color: var(--np-text-muted);
  }
  .spotlight :global(.np-page) {
    padding-top: 24px;
  }
</style>
