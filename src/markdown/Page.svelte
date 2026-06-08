<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { mount, unmount } from 'svelte'
  import type { PageModule } from '../types'
  import RightToc from '../layout/RightToc.svelte'
  import MermaidBlock from './MermaidBlock.svelte'
  import CodeBlock from './CodeBlock.svelte'
  import CodeGroup from './CodeGroup.svelte'

  let { page }: { page: PageModule } = $props()

  let container: HTMLElement
  let mounted: Array<{ destroy: () => void }> = []

  function langOf(pre: HTMLElement): string {
    const dataLang = pre.getAttribute('data-lang')
    if (dataLang) return dataLang
    const cls = pre.getAttribute('class')?.split(/\s+/) ?? []
    return cls.find((c) => c !== 'shiki' && c !== 'github-dark') ?? ''
  }

  async function hydrate() {
    for (const m of mounted) m.destroy()
    mounted = []
    await tick()
    if (!container) return

    const mermaids = container.querySelectorAll<HTMLDivElement>('.np-mermaid[data-graph]')
    for (const el of Array.from(mermaids)) {
      const graph = decodeBase64(el.dataset.graph ?? '')
      const host = document.createElement('div')
      el.replaceWith(host)
      const instance = mount(MermaidBlock, { target: host, props: { source: graph } })
      mounted.push({ destroy: () => unmount(instance) })
    }

    const groups = container.querySelectorAll<HTMLElement>('.np-code-group')
    for (const group of Array.from(groups)) {
      const pres = Array.from(group.querySelectorAll<HTMLElement>('pre'))
      if (pres.length === 0) continue
      const tabs = pres.map((pre) => ({
        lang: langOf(pre),
        html: pre.outerHTML,
        raw: pre.querySelector('code')?.innerText ?? ''
      }))
      const host = document.createElement('div')
      host.className = 'np-code-mount'
      group.replaceWith(host)
      const instance = mount(CodeGroup, { target: host, props: { tabs } })
      mounted.push({ destroy: () => unmount(instance) })
    }

    const pres = container.querySelectorAll<HTMLElement>('pre')
    for (const pre of Array.from(pres)) {
      if (pre.closest('.np-code')) continue
      if (pre.closest('.np-code-group')) continue
      if (pre.closest('.np-code-mount')) continue
      if (!pre.classList.contains('shiki') && !pre.hasAttribute('data-lang')) continue
      const lang = langOf(pre)
      const code = pre.querySelector('code')?.innerText ?? ''
      const host = document.createElement('div')
      host.className = 'np-code-mount'
      pre.replaceWith(host)
      const instance = mount(CodeBlock, {
        target: host,
        props: { html: pre.outerHTML, lang, raw: code }
      })
      mounted.push({ destroy: () => unmount(instance) })
    }
  }

  function decodeBase64(b: string): string {
    try {
      return decodeURIComponent(escape(atob(b)))
    } catch {
      return ''
    }
  }

  onMount(() => {
    void hydrate()
    if (window.location.hash) {
      const id = window.location.hash.slice(1)
      requestAnimationFrame(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' })
      })
    }
    return () => {
      for (const m of mounted) m.destroy()
    }
  })

  $effect(() => {
    page.slug
    void hydrate()
  })
</script>

<div class="np-page-shell">
  <div class="np-page">
    <article class="np-prose" bind:this={container}>
      {@html page.html}
    </article>
  </div>
  {#if !page.frontmatter.noToc}
    <div class="np-toc-rail">
      <RightToc headings={page.headings.filter((h) => h.level <= 3)} />
    </div>
  {/if}
</div>

<style>
  .np-page-shell {
    display: grid;
    grid-template-columns: minmax(0, 1024px);
    justify-content: center;
    gap: 0;
    width: 100%;
    align-items: stretch;
  }

  @media (min-width: 1280px) {
    .np-page-shell {
      grid-template-columns: minmax(0, 1024px) 240px;
      gap: 48px;
    }
  }

  .np-toc-rail :global(.np-toc) {
    position: sticky;
    top: calc(var(--np-header-height) + 24px);
    max-height: calc(100vh - var(--np-header-height) - 32px);
    overflow-y: auto;
  }

  .np-page {
    width: 100%;
    padding: 0 32px;
    box-sizing: border-box;
    min-width: 0;
  }

  .np-page :global(.np-prose) {
    max-width: none;
    width: 100%;
  }

  .np-toc-rail {
    min-width: 0;
  }

  @media (max-width: 1279px) {
    .np-toc-rail { display: none; }
  }
</style>
