export interface HashSpyOptions {
  selector: string
  root?: ParentNode
  topOffset?: number
}

export function setupHashSpy(opts: HashSpyOptions): () => void {
  if (typeof window === 'undefined') return () => {}
  const root: ParentNode = opts.root ?? document
  const topOffset = opts.topOffset ?? 96
  let raf = 0
  let lastHash = window.location.hash

  const update = () => {
    const targets = Array.from(root.querySelectorAll<HTMLElement>(opts.selector)).filter((el) => el.id)
    if (!targets.length) return
    let best: HTMLElement | null = null
    let bestTop = -Infinity
    for (const el of targets) {
      const top = el.getBoundingClientRect().top
      if (top <= topOffset && top > bestTop) {
        best = el
        bestTop = top
      }
    }
    if (!best) {
      const first = targets[0]
      const firstTop = first.getBoundingClientRect().top
      if (firstTop > topOffset && lastHash) {
        lastHash = ''
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
      return
    }
    const next = '#' + best.id
    if (next !== lastHash) {
      lastHash = next
      window.history.replaceState(null, '', window.location.pathname + window.location.search + next)
    }
  }

  const onScroll = () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      update()
    })
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  update()

  return () => {
    window.removeEventListener('scroll', onScroll)
    if (raf) cancelAnimationFrame(raf)
  }
}
