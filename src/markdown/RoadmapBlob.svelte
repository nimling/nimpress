<script lang="ts">
  import { onMount } from 'svelte'

  let {
    seed,
    points = 18,
    wobble = 0.025,
    margin = 0.05,
    fill = 'var(--np-bg-card)',
    stroke = 'var(--np-border)'
  }: {
    seed: string
    points?: number
    wobble?: number
    margin?: number
    fill?: string
    stroke?: string
  } = $props()

  let host: HTMLDivElement
  let measuredW = $state(320)
  let measuredH = $state(320)

  function seededRandom(input: string) {
    let h = 2166136261
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return () => {
      h += 0x6D2B79F5
      let t = Math.imul(h ^ (h >>> 15), 1 | h)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return (((t ^ (t >>> 14)) >>> 0) % 100000) / 100000
    }
  }

  const path = $derived(buildPath(seed, points, wobble, margin, measuredW, measuredH))

  function buildPath(s: string, n: number, w: number, m: number, W: number, H: number): string {
    if (W <= 0 || H <= 0) return ''
    const rand = seededRandom(s)
    const cx = W / 2
    const cy = H / 2
    const rx = (W / 2) * (Math.SQRT2 + m)
    const ry = (H / 2) * (Math.SQRT2 + m)
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n
      const k = 1 + rand() * w
      pts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k })
    }
    let d = ''
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i + n - 1) % n]
      const p1 = pts[i]
      const p2 = pts[(i + 1) % n]
      const p3 = pts[(i + 2) % n]
      const c1x = p1.x + (p2.x - p0.x) / 6
      const c1y = p1.y + (p2.y - p0.y) / 6
      const c2x = p2.x - (p3.x - p1.x) / 6
      const c2y = p2.y - (p3.y - p1.y) / 6
      if (i === 0) d += `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} `
      d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `
    }
    return d + 'Z'
  }

  onMount(() => {
    if (!host || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect
        if (rect.width > 0 && rect.height > 0) {
          measuredW = rect.width
          measuredH = rect.height
        }
      }
    })
    const parent = host.parentElement
    if (parent) ro.observe(parent)
    return () => ro.disconnect()
  })
</script>

<div class="np-blob-host" bind:this={host}>
  <svg
    class="np-blob"
    viewBox={`0 0 ${measuredW} ${measuredH}`}
    width={measuredW}
    height={measuredH}
    overflow="visible"
    aria-hidden="true"
  >
    <path d={path} fill={fill} stroke={stroke} stroke-width="1.5" />
  </svg>
</div>

<style>
  .np-blob-host {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    z-index: 0;
  }
  .np-blob {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    overflow: visible;
    pointer-events: none;
  }
</style>
