<script lang="ts">
  import type { PageModule } from '../types'
  import { configStore } from '../framework/configStore'
  import DbmlBlock from './DbmlBlock.svelte'

  let { page }: { page: PageModule } = $props()

  const config = $derived($configStore)
  const effectiveFooter = $derived(page.frontmatter.footer ?? config.footer)
  const hasBody = $derived((page.html ?? '').trim().length > 0)
</script>

<div class="np-dbml-page">
  <header class="np-dbml-head">
    <h1 class="np-dbml-title">{page.frontmatter.title}</h1>
    {#if page.frontmatter.description}
      <p class="np-dbml-desc">{page.frontmatter.description}</p>
    {/if}
    {#if hasBody}
      <article class="np-prose np-dbml-prose">
        {@html page.html}
      </article>
    {/if}
  </header>
  <div class="np-dbml-canvas">
    <DbmlBlock
      schema={page.dbmlSchema ?? ''}
      error={page.dbmlError ?? ''}
      height="100%"
      activateOnMount
    />
  </div>
  {#if effectiveFooter}
    <footer class="np-dbml-footer">{effectiveFooter}</footer>
  {/if}
</div>

<style>
  .np-dbml-page {
    position: relative;
    display: grid;
    grid-template-rows: auto minmax(360px, 1fr) auto;
    height: 100%;
    min-height: 640px;
    box-sizing: border-box;
  }
  .np-dbml-head {
    padding: 32px 32px 8px;
  }
  .np-dbml-title {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
    color: var(--np-text-primary);
  }
  .np-dbml-desc {
    margin: 8px 0 0;
    font-size: 15px;
    line-height: 1.6;
    color: var(--np-text-secondary);
  }
  .np-dbml-prose {
    margin-top: 16px;
  }
  .np-dbml-canvas {
    min-height: 0;
    padding: 8px 32px 24px;
    box-sizing: border-box;
  }
  .np-dbml-canvas :global(.np-dbml-wrapper) {
    margin: 0;
    height: 100%;
  }
  .np-dbml-footer {
    padding: 0 32px 24px;
    text-align: center;
    color: var(--np-text-faint);
    font-size: 13px;
    white-space: pre-line;
  }
  @media (max-width: 1024px) {
    .np-dbml-page {
      height: auto;
    }
    .np-dbml-head {
      max-height: none;
      overflow: visible;
    }
    .np-dbml-canvas {
      height: 70vh;
      padding: 8px 16px 24px;
    }
  }
</style>
