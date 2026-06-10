<script lang="ts">
  let {
    seed,
    width = 320,
    height = 220,
    points = 14,
    wobble = 0.28,
    fill = 'var(--np-bg-card)',
    stroke = 'var(--np-border)'
  }: {
    seed: string
    width?: number
    height?: number
    points?: number
    wobble?: number
    fill?: string
    stroke?: string
  } = $props()

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

  const path = $derived(buildPath(seed, points, wobble, width, height))

  function buildPath(s: string, n: number, w: number, W: number, H: number): string {
    const rand = seededRandom(s)
    const cx = W / 2
    const cy = H / 2
    const rx = (W / 2) * 0.94
    const ry = (H / 2) * 0.94
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n
      const k = 1 + (rand() - 0.5) * 2 * w
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
</script>

<svg class="np-blob" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
  <path d={path} fill={fill} stroke={stroke} stroke-width="1.5" />
</svg>

<style>
  .np-blob {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
