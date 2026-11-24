export function setupTooltip(): () => void {
  if (typeof document === 'undefined') return () => {}
  const tip = document.createElement('div')
  tip.className = 'np-tooltip'
  tip.style.display = 'none'
  document.body.appendChild(tip)
  let current: Element | null = null

  function hide() {
    current = null
    tip.style.display = 'none'
  }

  function place(target: Element) {
    const r = target.getBoundingClientRect()
    const tr = tip.getBoundingClientRect()
    let x = r.left + r.width / 2 - tr.width / 2
    x = Math.min(Math.max(4, x), window.innerWidth - tr.width - 4)
    let y = r.bottom + 6
    if (y + tr.height > window.innerHeight - 4) y = r.top - tr.height - 6
    y = Math.min(Math.max(4, y), window.innerHeight - tr.height - 4)
    tip.style.left = `${Math.round(x)}px`
    tip.style.top = `${Math.round(y)}px`
  }

  function over(e: PointerEvent) {
    const target = (e.target as Element | null)?.closest?.('.np-tip') ?? null
    if (!target) return
    const label = target.getAttribute('aria-label')
    if (!label) {
      hide()
      return
    }
    current = target
    tip.textContent = label
    tip.style.display = 'block'
    place(target)
  }

  function out(e: PointerEvent) {
    if (!current) return
    const to = e.relatedTarget as Element | null
    if (to && (current.contains(to) || to.closest?.('.np-tip') === current)) return
    hide()
  }

  document.addEventListener('pointerover', over)
  document.addEventListener('pointerout', out)
  document.addEventListener('pointerdown', hide, true)
  document.addEventListener('scroll', hide, true)
  return () => {
    document.removeEventListener('pointerover', over)
    document.removeEventListener('pointerout', out)
    document.removeEventListener('pointerdown', hide, true)
    document.removeEventListener('scroll', hide, true)
    tip.remove()
  }
}
