import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('inline formatting renders marks, inserts, deletions, and scripts', async ({ page }) => {
  const errors = await open(page, 'examples/formatting')
  const prose = page.locator('.np-prose')
  await expect(prose.locator('mark', { hasText: 'highlighted' })).toBeVisible()
  await expect(prose.locator('ins', { hasText: 'inserted' })).toBeVisible()
  await expect(prose.locator('del', { hasText: 'deleted' })).toBeVisible()
  await expect(prose.locator('sub', { hasText: '2' }).first()).toBeVisible()
  await expect(prose.locator('sup', { hasText: '2' }).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('keyboard keys render as a chain of kbd elements with glyphs', async ({ page }) => {
  await open(page, 'examples/formatting')
  const chain = page.locator('.np-keys').first()
  await expect(chain.locator('.np-key')).toHaveCount(3)
  await expect(chain.locator('.np-key').first()).toHaveText('Ctrl')
  await expect(page.locator('.np-keys').nth(1).locator('.np-key').first()).toHaveText('⌘')
})

test('images float, carry captions, and load lazily after the first', async ({ page }) => {
  await open(page, 'examples/formatting')
  await expect(page.locator('img.np-img-right')).toBeVisible()
  const figure = page.locator('figure.np-figure')
  await expect(figure).toBeVisible()
  await expect(figure.locator('.np-figcaption')).toHaveText('The figure caption comes from the image title')
  const loading = await page.locator('.np-prose img').evaluateAll((images) => images.map((image) => image.getAttribute('loading')))
  expect(loading[0]).toBeNull()
  expect(loading.slice(1).every((value) => value === 'lazy')).toBe(true)
})

test('theme variants swap with the theme toggle', async ({ page }) => {
  await open(page, 'examples/formatting')
  const light = page.locator('img.np-img-light')
  const dark = page.locator('img.np-img-dark')
  const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  await expect(wasDark ? dark : light).toBeVisible()
  await expect(wasDark ? light : dark).toBeHidden()
  await page.locator('button[aria-label="Toggle theme"]').click()
  await expect(wasDark ? light : dark).toBeVisible()
  await expect(wasDark ? dark : light).toBeHidden()
})

test('a zoom image opens the lightbox and escape closes it', async ({ page }) => {
  await open(page, 'examples/formatting')
  await page.locator('img.zoom').click()
  const box = page.locator('.np-lightbox')
  await expect(box).toBeVisible()
  await expect(box.locator('.np-lightbox-image')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(box).toHaveCount(0)
  await page.locator('img.zoom').click()
  await page.locator('.np-lightbox-close').click()
  await expect(page.locator('.np-lightbox')).toHaveCount(0)
})
