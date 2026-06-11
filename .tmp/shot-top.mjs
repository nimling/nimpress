import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5173/solutions/bookable/roadmap'
const out = process.argv[3] ?? '/tmp/roadmap.png'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(1200)
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }))
await page.waitForTimeout(200)
await page.screenshot({ path: out, fullPage: false })
await browser.close()
