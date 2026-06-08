<script lang="ts">
  let { method, size = 'md' }: { method: string; size?: 'sm' | 'md' | 'lg' } = $props()

  const styles: Record<string, string> = {
    GET: 'var(--np-method-get)',
    POST: 'var(--np-method-post)',
    PUT: 'var(--np-method-put)',
    PATCH: 'var(--np-method-patch)',
    DELETE: 'var(--np-method-delete)'
  }
  const color = $derived(styles[method.toUpperCase()] ?? 'var(--np-text-muted)')
</script>

<span class="np-method np-method-{size}" style="--mc: {color}">{method.toUpperCase()}</span>

<style>
  .np-method {
    display: inline-flex;
    align-items: center;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border-radius: var(--np-radius-sm);
    color: var(--mc);
    background-color: color-mix(in srgb, var(--mc) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--mc) 40%, transparent);
    font-family: var(--np-font-mono);
    line-height: 1;
  }
  .np-method-sm { padding: 2px 6px; font-size: 10px; }
  .np-method-md { padding: 4px 8px; font-size: 11px; }
  .np-method-lg { padding: 6px 12px; font-size: 13px; }
</style>
