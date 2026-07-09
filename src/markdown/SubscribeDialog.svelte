<script lang="ts">
  import { configStore } from '../framework/configStore'
  import { viewer } from '../framework/stores/viewer'
  import { startLogin, getAuthEndpoint, getAppSlug } from '@nimling/samna-auth-middleware'

  let {
    title,
    feedPath,
    emailEnabled,
    onClose
  }: {
    title: string
    feedPath: string
    emailEnabled: boolean
    onClose: () => void
  } = $props()

  const config = $derived($configStore)
  const v = $derived($viewer)
  const feedUrl = $derived.by(() => {
    const base = config.site?.url?.replace(/\/$/, '')
    if (base) return `${base}${feedPath}`
    return new URL(feedPath, window.location.origin).href
  })
  const emailReady = $derived(
    emailEnabled &&
      (typeof config.authCallbacks?.onSubscribe === 'function' ||
        config.subscribe?.endpoint !== undefined ||
        config.authEndpoint !== undefined)
  )

  let sendState = $state<'idle' | 'sending' | 'done' | 'failed'>('idle')
  let copied = $state(false)
  let failure = $state('')

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  async function copyFeedUrl() {
    await navigator.clipboard.writeText(feedUrl)
    copied = true
  }

  function login() {
    startLogin(undefined, window.location.pathname + window.location.search)
  }

  function subscribeUrl(): string {
    if (config.subscribe?.endpoint) return config.subscribe.endpoint
    const slug = config.subscribe?.appSlug ?? getAppSlug()
    return `${getAuthEndpoint().replace(/\/$/, '')}/api/app/${slug}/subscription`
  }

  async function subscribe() {
    sendState = 'sending'
    failure = ''
    try {
      const feedRes = await fetch(feedPath)
      if (!feedRes.ok) throw new Error(`feed request returned ${feedRes.status}`)
      const xml = await feedRes.text()
      const handler = config.authCallbacks?.onSubscribe
      if (handler) {
        await handler({ title, feedUrl, xml, email: v.email })
      } else {
        const res = await fetch(subscribeUrl(), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/rss+xml',
            'SAuth-App-Slug': config.subscribe?.appSlug ?? config.clientSlug ?? ''
          },
          body: xml
        })
        if (!res.ok) throw new Error(`subscription request returned ${res.status}`)
      }
      sendState = 'done'
    } catch (err) {
      sendState = 'failed'
      failure = String(err)
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="np-subscribe-backdrop" onclick={onClose} role="presentation">
  <div
    class="np-subscribe-modal"
    role="dialog"
    aria-label="Subscribe"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="np-subscribe-head">
      <span class="np-subscribe-title">Subscribe to {title}</span>
      <button class="np-subscribe-close" onclick={onClose} aria-label="Close">Esc</button>
    </div>

    <div class="np-subscribe-body">
      <div class="np-subscribe-section">
        <span class="np-subscribe-label">RSS feed</span>
        <div class="np-subscribe-feed-row">
          <input class="np-subscribe-feed-url" readonly value={feedUrl} />
          <button class="np-subscribe-btn" onclick={copyFeedUrl}>{copied ? 'Copied' : 'Copy'}</button>
          <a class="np-subscribe-btn" href={feedUrl} target="_blank" rel="noopener">Open</a>
        </div>
        <p class="np-subscribe-hint">Add this URL to your feed reader to follow new releases.</p>
      </div>

      {#if emailReady}
        <div class="np-subscribe-section">
          <span class="np-subscribe-label">Email</span>
          {#if v.authenticated}
            <div class="np-subscribe-feed-row">
              <input class="np-subscribe-feed-url" readonly value={v.email ?? ''} />
              <button
                class="np-subscribe-btn np-subscribe-primary"
                disabled={sendState === 'sending' || sendState === 'done'}
                onclick={subscribe}
              >
                {sendState === 'sending' ? 'Subscribing…' : sendState === 'done' ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>
            {#if sendState === 'done'}
              <p class="np-subscribe-hint">You get an email when a new release ships.</p>
            {:else if sendState === 'failed'}
              <p class="np-subscribe-error">{failure}</p>
            {:else}
              <p class="np-subscribe-hint">New releases land in your inbox.</p>
            {/if}
          {:else}
            <div class="np-subscribe-feed-row">
              <button class="np-subscribe-btn np-subscribe-primary" onclick={login}>Log in to subscribe</button>
            </div>
            <p class="np-subscribe-hint">Email subscriptions follow your account.</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .np-subscribe-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 96px;
    z-index: 50;
  }
  .np-subscribe-modal {
    width: min(520px, 92vw);
    background-color: var(--np-bg);
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-lg);
    box-shadow: var(--np-shadow-modal);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .np-subscribe-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--np-divider);
  }
  .np-subscribe-title {
    font-weight: 600;
    color: var(--np-text-primary);
  }
  .np-subscribe-close {
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    background: none;
    color: var(--np-text-muted);
    font-size: 12px;
    padding: 2px 8px;
    cursor: pointer;
  }
  .np-subscribe-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 16px;
  }
  .np-subscribe-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .np-subscribe-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--np-text-muted);
  }
  .np-subscribe-feed-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .np-subscribe-feed-url {
    flex: 1 1 auto;
    min-width: 0;
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    background-color: var(--np-bg);
    color: var(--np-text-primary);
    font-size: 13px;
    padding: 6px 10px;
  }
  .np-subscribe-btn {
    border: 1px solid var(--np-border);
    border-radius: var(--np-radius-sm);
    background: none;
    color: var(--np-text-primary);
    font-size: 13px;
    padding: 6px 12px;
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
  }
  .np-subscribe-btn:hover {
    border-color: var(--np-brand);
  }
  .np-subscribe-primary {
    background-color: var(--np-brand);
    border-color: var(--np-brand);
    color: #fff;
  }
  .np-subscribe-primary:disabled {
    opacity: 0.7;
    cursor: default;
  }
  .np-subscribe-hint {
    margin: 0;
    font-size: 12px;
    color: var(--np-text-muted);
  }
  .np-subscribe-error {
    margin: 0;
    font-size: 12px;
    color: var(--np-danger);
  }
</style>
