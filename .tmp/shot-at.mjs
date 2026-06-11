import { chromium } from 'playwright'

const url = process.argv[2]
const out = process.argv[3]
const scrollPos = process.argv[4] // 'top' | 'bottom' | number | 'rocket'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(1200)
if (scrollPos === 'top') {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }))
} else if (scrollPos === 'bottom') {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' }))
} else if (scrollPos === 'rocket') {
  // keep default scroll on mount
} else {
  await page.evaluate((y) => window.scrollTo({ top: Number(y), behavior: 'auto' }), scrollPos)
}
await page.waitForTimeout(300)
await page.screenshot({ path: out, fullPage: false })
await browser.close()
