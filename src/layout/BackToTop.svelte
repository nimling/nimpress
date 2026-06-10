<script lang="ts">
  import { onMount } from 'svelte'

  let { threshold = 600 }: { threshold?: number } = $props()

  let visible = $state(false)

  function onScroll() {
    visible = window.scrollY > threshold
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  onMount(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  })
</script>

<button
  type="button"
  class="np-back-to-top"
  class:show={visible}
  onclick={scrollToTop}
  aria-label="Back to top"
  title="Back to top"
>
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="6 14 12 8 18 14" />
  </svg>
</button>

<style>
  .np-back-to-top {
    position: fixed;
    left: calc(var(--np-sidebar-width) + 20px);
    bottom: 20px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--np-bg-surface);
    color: var(--np-text-muted);
    border: 1px solid var(--np-border);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
    transform: translate(-140px, 140px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease, color 0.15s ease, border-color 0.15s ease;
    z-index: 5;
  }
  .np-back-to-top:hover {
    color: var(--np-text-primary);
    border-color: var(--np-brand);
  }
  .np-back-to-top:focus-visible {
    outline: 2px solid var(--np-brand);
    outline-offset: 2px;
  }
  .np-back-to-top.show {
    opacity: 1;
    pointer-events: auto;
    animation: np-back-to-top-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  @keyframes np-back-to-top-in {
    0% { transform: translate(-140px, 140px); }
    70% { transform: translate(8px, -8px); }
    100% { transform: translate(0, 0); }
  }
  @media (max-width: 1024px) {
    .np-back-to-top { left: 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .np-back-to-top.show {
      animation: none;
      transform: translate(0, 0);
    }
  }
</style>
