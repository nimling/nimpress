<script lang="ts">
  import Page from '../markdown/Page.svelte'
  import ChangelogPage from '../markdown/ChangelogPage.svelte'
  import HeroPage from '../markdown/HeroPage.svelte'
  import RoadmapPage from '../markdown/RoadmapPage.svelte'
  import OpenApiRoot from '../api/OpenApiRoot.svelte'
  import { setPageMeta } from '../framework/pageMeta'
  import { applyPageStyles } from '../framework/pageStyles'
  import { gatedContentBase, gatedFetch } from '../framework/gated'
  import type { PageBody, PageShell } from '../types'

  let { shell }: { shell: PageShell } = $props()

  setPageMeta(shell)
  applyPageStyles(shell.path)

  const bodyUrl = `${gatedContentBase()}/${shell.bundle ?? 'default'}/body/${shell.slug === '' ? '__root__' : shell.slug}.json`
  const bodyPromise: Promise<{ default: PageBody }> = gatedFetch(bodyUrl).then(
    async (res: Response) => {
      if (!res.ok) throw new Error(`gated body request returned ${res.status}`)
      return { default: (await res.json()) as PageBody }
    }
  )
</script>

{#if shell.type === 'hero'}
  <HeroPage page={shell} {bodyPromise} />
{:else}
  {#await bodyPromise}
    <div class="np-page-loading" aria-busy="true"></div>
  {:then mod}
    {#if shell.type === 'openapi' && mod.default.openApiSpec}
      <OpenApiRoot spec={mod.default.openApiSpec} title={shell.frontmatter.title} frontmatter={shell.frontmatter} />
    {:else if shell.type === 'changelog'}
      <ChangelogPage page={{ ...shell, ...mod.default }} />
    {:else if shell.type === 'roadmap'}
      <RoadmapPage page={{ ...shell, ...mod.default }} />
    {:else}
      <Page page={{ ...shell, ...mod.default }} />
    {/if}
  {:catch err}
    <div class="np-page-error">Failed to load page body: {String(err)}</div>
  {/await}
{/if}
