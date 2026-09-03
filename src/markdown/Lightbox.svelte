<script lang="ts">
  let { src, alt = '', onClose }: { src: string; alt?: string; onClose: () => void } = $props()

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose()
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="np-lightbox" role="dialog" aria-modal="true" aria-label={alt || 'Image'}>
  <button type="button" class="np-lightbox-backdrop" aria-label="Close" onclick={onClose}></button>
  <img class="np-lightbox-image" {src} {alt} />
  <button type="button" class="np-lightbox-close" aria-label="Close" onclick={onClose}>×</button>
</div>

<style>
  .np-lightbox {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: grid;
    place-items: center;
    padding: 32px;
  }
  .np-lightbox-backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background-color: var(--np-lightbox-backdrop);
    cursor: zoom-out;
  }
  .np-lightbox-image {
    position: relative;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: var(--np-radius-md);
    box-shadow: 0 24px 64px rgb(0 0 0 / 0.4);
  }
  .np-lightbox-close {
    position: absolute;
    top: 16px;
    right: 20px;
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: var(--np-radius-pill);
    background-color: rgb(255 255 255 / 0.12);
    color: #ffffff;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
  }
  .np-lightbox-close:hover {
    background-color: rgb(255 255 255 / 0.24);
  }
</style>
