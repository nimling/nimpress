import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5173/solutions/bookable/roadmap'
const out = process.argv[3] ?? '/tmp/roadmap.png'
const width = Number(process.argv[4] ?? 1440)
const height = Number(process.argv[5] ?? 900)
const fullPage = (process.argv[6] ?? 'full') !== 'view'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.error('PAGEERR', e.message))
page.on('console', (m) => {
  if (m.type() === 'error') console.error('CONSOLE', m.text())
})
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(800)
await page.screenshot({ path: out, fullPage })
const size = await page.evaluate(() => ({
  scrollH: document.documentElement.scrollHeight,
  cards: Array.from(document.querySelectorAll('.np-roadmap-card')).map((el) => {
    const r = el.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), title: el.querySelector('.np-roadmap-card-title')?.textContent }
  })
}))
console.log(JSON.stringify(size, null, 2))
await browser.close()
