import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a page without authored keywords carries generated ones and a plain robots directive', async ({ page }) => {
  await open(page, 'getting-started')
  const keywords = await page.locator('meta[name="keywords"]').getAttribute('content')
  expect(keywords?.split(',').length).toBeGreaterThan(3)
  const robots = await page.locator('meta[name="robots"]').getAttribute('content')
  expect(robots).not.toContain('noai')
})

test('a page with meta ai false carries the noai directives', async ({ page }) => {
  await open(page, 'examples/pricing')
  const robots = await page.locator('meta[name="robots"]').getAttribute('content')
  expect(robots).toContain('noai, noimageai')
})

test('robots.txt lists the ai crawlers with the site policy', async ({ request }) => {
  const robots = await (await request.get('robots.txt')).text()
  expect(robots).toContain('User-agent: GPTBot')
  expect(robots).toContain('Sitemap: https://nimling.github.io/nimpress/sitemap.xml')
})
