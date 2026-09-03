<script lang="ts">
  import type { PageModule } from '../types'
  import { withBase } from '../framework/configStore'
  import Page from './Page.svelte'

  interface Tier {
    name: string
    price?: string
    period?: string
    description?: string
    benefitsHtml?: string[]
    action?: { text: string; link: string; variant?: 'primary' | 'secondary' | 'ghost' }
    highlight?: boolean
  }

  let { page }: { page: PageModule } = $props()

  const data = $derived((page.frontmatter.data ?? {}) as Record<string, unknown>)
  const tiers = $derived((Array.isArray(data.tiers) ? data.tiers : []) as Tier[])
  const columns = $derived(typeof data.columns === 'number' ? (data.columns as number) : Math.min(tiers.length, 4))
  const footnoteHtml = $derived(typeof data.footnoteHtml === 'string' ? (data.footnoteHtml as string) : '')

  function href(link: string): string {
    return /^[a-z][a-z0-9+.-]*:/i.test(link) ? link : withBase(link)
  }
</script>

<Page {page}>
  <div class="np-pricing-grid" style:--np-pricing-columns={columns}>
    {#each tiers as tier (tier.name)}
      <article class="np-pricing-tier" class:np-pricing-tier-highlight={tier.highlight}>
        <h2 class="np-pricing-name">{tier.name}</h2>
        {#if tier.price}
          <p class="np-pricing-price">
            <span>{tier.price}</span>
            {#if tier.period}<span class="np-pricing-period">{tier.period}</span>{/if}
          </p>
        {/if}
        {#if tier.description}<p class="np-pricing-description">{tier.description}</p>{/if}
        {#if tier.benefitsHtml?.length}
          <ul class="np-pricing-benefits">
            {#each tier.benefitsHtml as benefit, index (index)}
              <li class="np-pricing-benefit"><span class="np-pricing-check" aria-hidden="true">✓</span><span>{@html benefit}</span></li>
            {/each}
          </ul>
        {/if}
        {#if tier.action}
          <a class={`np-pricing-action np-pricing-action-${tier.action.variant ?? 'primary'}`} href={href(tier.action.link)}>{tier.action.text}</a>
        {/if}
      </article>
    {/each}
  </div>
  {#if footnoteHtml}
    <p class="np-pricing-footnote">{@html footnoteHtml}</p>
  {/if}
</Page>

<style>
  .np-pricing-grid {
    display: grid;
    grid-template-columns: repeat(var(--np-pricing-columns, 3), minmax(0, 1fr));
    gap: 20px;
    margin-top: 32px;
    align-items: stretch;
  }
  @media (max-width: 900px) {
    .np-pricing-grid {
      grid-template-columns: 1fr;
    }
  }
  .np-pricing-tier {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 28px 24px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    background-color: var(--np-bg-card);
  }
  .np-pricing-tier-highlight {
    border-color: var(--np-brand);
    box-shadow: 0 0 0 1px var(--np-brand);
  }
  .np-pricing-name {
    margin: 0;
    font-size: 1.1em;
    color: var(--np-text-primary);
  }
  .np-pricing-price {
    margin: 0;
    font-size: 2em;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--np-text-primary);
  }
  .np-pricing-period {
    margin-left: 6px;
    font-size: 0.45em;
    font-weight: 400;
    color: var(--np-text-muted);
  }
  .np-pricing-description {
    margin: 0;
    font-size: 14px;
    color: var(--np-text-muted);
  }
  .np-pricing-benefits {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: grid;
    gap: 8px;
    flex: 1;
  }
  .np-pricing-benefit {
    display: flex;
    gap: 8px;
    font-size: 14px;
    color: var(--np-text-primary);
  }
  .np-pricing-check {
    color: var(--np-success);
    font-weight: 700;
  }
  .np-pricing-action {
    display: inline-flex;
    justify-content: center;
    padding: 10px 16px;
    border-radius: var(--np-radius-md);
    font-weight: 600;
    text-decoration: none;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .np-pricing-action-primary {
    background-color: var(--np-brand);
    color: #ffffff;
  }
  .np-pricing-action-primary:hover {
    background-color: var(--np-brand-hover, var(--np-brand));
  }
  .np-pricing-action-secondary {
    border: 1px solid var(--np-border);
    color: var(--np-text-primary);
  }
  .np-pricing-action-secondary:hover {
    border-color: var(--np-brand);
  }
  .np-pricing-action-ghost {
    color: var(--np-brand);
  }
  .np-pricing-footnote {
    margin-top: 16px;
    font-size: 13px;
    color: var(--np-text-faint);
    text-align: center;
  }
</style>
