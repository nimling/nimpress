<script lang="ts">
  let { size = 16, title = 'Fullscreen' }: { size?: number; title?: string } = $props()
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden={title ? undefined : 'true'}
  role={title ? 'img' : undefined}
>
  {#if title}
    <title>{title}</title>
  {/if}
  <polyline points="4 9 4 4 9 4" />
  <polyline points="20 9 20 4 15 4" />
  <polyline points="4 15 4 20 9 20" />
  <polyline points="20 15 20 20 15 20" />
</svg>
