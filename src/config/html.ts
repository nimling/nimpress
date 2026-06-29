import type { ResolvedNimpressConfig } from '../types'

export function indexHtml(resolved: ResolvedNimpressConfig): string {
  const favicon = resolved.logo ?? `${resolved.assetUrlBase}/logo.png`
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="${favicon}" />
    <title>${resolved.title}</title>
    <script>
      try {
        const k = 'nimpress-theme'
        const v = localStorage.getItem(k)
        const mode = v === 'light' || v === 'dark'
          ? v
          : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        if (mode === 'dark') document.documentElement.classList.add('dark')
      } catch {}
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="virtual:nimpress/main"></script>
  </body>
</html>
`
}
