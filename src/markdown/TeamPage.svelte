<script lang="ts">
  import type { PageModule } from '../types'
  import { withBase } from '../framework/configStore'
  import Page from './Page.svelte'

  interface Member {
    name: string
    role?: string
    image?: string
    bioHtml?: string
    links?: Array<{ text: string; link: string }>
  }

  let { page }: { page: PageModule } = $props()

  const data = $derived((page.frontmatter.data ?? {}) as Record<string, unknown>)
  const members = $derived((Array.isArray(data.members) ? data.members : []) as Member[])
  const columns = $derived(typeof data.columns === 'number' ? (data.columns as number) : undefined)
  const align = $derived(data.align === 'center' ? 'center' : 'start')

  function slug(name: string): string {
    return `member-${name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}`
  }

  function monogram(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
  }

  function href(link: string): string {
    return /^[a-z][a-z0-9+.-]*:/i.test(link) ? link : withBase(link)
  }
</script>

<Page {page}>
  <div class={`np-team-grid np-team-align-${align}`} style:grid-template-columns={columns ? `repeat(${columns}, minmax(0, 1fr))` : undefined}>
    {#each members as member (member.name)}
      <article class="np-team-member" id={slug(member.name)}>
        {#if member.image}
          <img class="np-team-image" src={withBase(member.image)} alt={member.name} loading="lazy" />
        {:else}
          <div class="np-team-monogram" aria-hidden="true">{monogram(member.name)}</div>
        {/if}
        <h2 class="np-team-name">{member.name}</h2>
        {#if member.role}<p class="np-team-role">{member.role}</p>{/if}
        {#if member.bioHtml}<p class="np-team-bio">{@html member.bioHtml}</p>{/if}
        {#if member.links?.length}
          <div class="np-team-links">
            {#each member.links as entry (entry.link)}
              <a class="np-team-link" href={href(entry.link)} target={/^[a-z][a-z0-9+.-]*:/i.test(entry.link) ? '_blank' : undefined} rel="noopener">{entry.text}</a>
            {/each}
          </div>
        {/if}
      </article>
    {/each}
  </div>
</Page>

<style>
  .np-team-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-top: 32px;
  }
  .np-team-member {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 24px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    background-color: var(--np-bg-card);
    scroll-margin-top: calc(var(--np-header-height) + 16px);
  }
  .np-team-align-center .np-team-member {
    align-items: center;
    text-align: center;
  }
  .np-team-image,
  .np-team-monogram {
    width: 80px;
    height: 80px;
    border-radius: var(--np-radius-pill);
    object-fit: cover;
    margin-bottom: 8px;
  }
  .np-team-monogram {
    display: grid;
    place-items: center;
    background-color: var(--np-brand);
    color: #ffffff;
    font-weight: 700;
    font-size: 24px;
  }
  .np-team-name {
    margin: 0;
    font-size: 1.15em;
    color: var(--np-text-primary);
  }
  .np-team-role {
    margin: 0;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--np-brand);
  }
  .np-team-bio {
    margin: 4px 0 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--np-text-muted);
  }
  .np-team-links {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 8px;
  }
  .np-team-link {
    font-size: 13px;
    color: var(--np-brand);
    text-decoration: none;
  }
  .np-team-link:hover {
    text-decoration: underline;
  }
</style>
