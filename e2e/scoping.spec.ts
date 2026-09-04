import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a component file beside a page scopes its rules to that component on that page', async ({ page }) => {
  await open(page, 'examples/callouts')
  const border = await page.locator('.np-callout').first().evaluate((el) => getComputedStyle(el).borderStyle)
  expect(border).toBe('dashed')
  await expect(page.locator('style[data-np-page-style="/examples/callouts"]')).toHaveCount(1)
  await page.goto('examples/tabs')
  await expect(page.locator('.np-app')).toBeVisible()
  await expect(page.locator('style[data-np-page-style="/examples/callouts"]')).toHaveCount(0)
})

test('a component file in the styles folder reaches that component on every page', async ({ page }) => {
  await open(page, 'getting-started')
  const spacing = await page.locator('.np-tags .np-tag').first().evaluate((el) => getComputedStyle(el).letterSpacing)
  expect(spacing).not.toBe('normal')
  await expect(page.locator('style[data-np-page-style="/"]')).toHaveCount(1)
})
