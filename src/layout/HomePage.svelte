<script lang="ts">
  import { configStore, withBase } from '../framework/configStore'
  const config = $derived($configStore)
</script>

<section class="np-hero">
  <h1 class="np-home-title">{config.title}</h1>
  <p class="np-home-lead">Documentation for the ecosystem.</p>
  <div class="np-cards">
    {#each (config.navRoutes ?? []) as r (r.link)}
      <a class="np-card" href={withBase(r.link)}>
        <h3 class="np-home-card-title">{r.text}</h3>
      </a>
    {/each}
  </div>
</section>

<style>
  .np-hero {
    max-width: 960px;
    margin: 0 auto;
    padding: 64px 24px;
  }
  .np-home-title {
    font-size: 48px;
    line-height: 56px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 16px;
    color: var(--np-text-primary);
  }
  .np-home-lead {
    font-size: 18px;
    color: var(--np-text-secondary);
    margin: 0 0 48px;
  }
  .np-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }
  .np-card {
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    padding: 20px;
    background-color: var(--np-bg-card);
    text-decoration: none;
    color: var(--np-text-primary);
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .np-card:hover {
    border-color: var(--np-brand);
    box-shadow: var(--np-shadow-card);
  }
  .np-card .np-home-card-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
</style>
