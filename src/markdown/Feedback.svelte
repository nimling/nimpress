<script lang="ts">
  import { configStore } from '../framework/configStore'
  import { viewer } from '../framework/stores/viewer'
  import { sendFeedback } from '../feedback/feedback'
  import type { NimpressFeedbackRating } from '../types'

  let { path }: { path: string } = $props()

  const feedback = $derived($configStore.feedback)
  let chosen = $state<NimpressFeedbackRating | null>(null)

  async function rate(rating: NimpressFeedbackRating) {
    chosen = rating
    document.dispatchEvent(new CustomEvent('nimpress:feedback', { detail: { path, data: rating.data, name: rating.name } }))
    try {
      await sendFeedback($viewer, path, rating.data, rating.name)
    } catch (error) {
      console.warn('[nimpress] feedback was not delivered', error)
    }
  }

  $effect(() => {
    path
    chosen = null
  })
</script>

{#if feedback}
  <section class="np-feedback" aria-label={feedback.title}>
    <p class="np-feedback-title">{feedback.title}</p>
    {#if chosen}
      <p class="np-feedback-note">{@html chosen.html ?? chosen.note}</p>
    {:else}
      <div class="np-feedback-ratings">
        {#each feedback.ratings as rating (rating.data)}
          <button type="button" class="np-feedback-rating" title={rating.name} aria-label={rating.name} data-value={rating.data} onclick={() => rate(rating)}>
            <span class="np-feedback-icon" aria-hidden="true">{rating.icon}</span>
          </button>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<style>
  .np-feedback {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px 16px;
    margin-top: 48px;
    padding: 16px 20px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-md);
    background-color: var(--np-bg-surface);
    color: var(--np-text-muted);
    font-size: 14px;
  }
  .np-feedback-title,
  .np-feedback-note {
    margin: 0;
  }
  .np-feedback-note :global(a) {
    color: var(--np-brand);
  }
  .np-feedback-ratings {
    display: flex;
    gap: 8px;
  }
  .np-feedback-rating {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-pill);
    background-color: var(--np-bg);
    color: inherit;
    font-size: 18px;
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .np-feedback-rating:hover {
    border-color: var(--np-brand);
    transform: translateY(-1px);
  }
  .np-feedback-icon {
    line-height: 1;
  }
</style>
