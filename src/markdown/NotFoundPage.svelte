<script lang="ts">
  import type { PageElement, PageModule } from '../types'
  import Page from './Page.svelte'

  let { page }: { page: PageModule } = $props()

  const hide = $derived<PageElement[]>(Array.from(new Set<PageElement>(['toc', 'footer', ...(page.frontmatter.hide ?? [])])))
</script>

<div class="np-notfound">
  <header class="np-notfound-head">
    <p class="np-notfound-code">404</p>
    <h1 class="np-notfound-title">{page.frontmatter.title}</h1>
  </header>
  <div class="np-notfound-body">
    <Page page={{ ...page, frontmatter: { ...page.frontmatter, hide } }} />
  </div>
</div>

<style>
  .np-notfound-head {
    max-width: var(--np-content-max, 1024px);
    margin: 0 auto;
    padding: 96px 32px 0;
    box-sizing: border-box;
    text-align: center;
  }
  .np-notfound-code {
    margin: 0;
    font-size: clamp(3em, 10vw, 6em);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
    color: var(--np-brand);
  }
  .np-notfound-title {
    margin: 0.25em 0 0;
    font-size: clamp(1.5em, 3vw, 2.25em);
    color: var(--np-text-primary);
  }
  .np-notfound-body :global(.np-page) {
    padding-top: 24px;
    text-align: center;
  }
</style>
