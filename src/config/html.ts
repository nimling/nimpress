import type { ResolvedNimpressConfig } from '../types'

export function indexHtml(resolved: ResolvedNimpressConfig, entrySrc = 'virtual:nimpress/main'): string {
  const favicon = resolved.logo ? `\n    <link rel="icon" href="${resolved.logo}" />` : ''
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />${favicon}
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
    <script type="module" src="${entrySrc}"></script>
  </body>
</html>
`
}
