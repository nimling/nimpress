import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a nested doc page carries the sidebar, breadcrumbs, and the right rail', async ({ page }) => {
  const errors = await open(page, 'page-types/doc')
  await expect(page.locator('.np-sidebar')).toBeVisible()
  await expect(page.locator('.np-crumbs')).toBeVisible()
  await expect(page.locator('.np-toc-wrap')).toBeVisible()
  expect(errors).toEqual([])
})

test('the search modal opens from the header trigger and lists results', async ({ page }) => {
  await open(page, 'getting-started')
  await page.locator('.np-search-trigger').first().click()
  await expect(page.locator('.np-search-modal')).toBeVisible()
  await page.locator('.np-search-input').fill('frontmatter')
  await expect(page.locator('.np-results button').first()).toBeVisible()
})

test('the mode toggle switches the dark class', async ({ page }) => {
  await open(page, 'getting-started')
  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  await page.locator('.np-mode-toggle').click()
  const after = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  expect(after).not.toBe(before)
})


test('the theme menu switches the site theme and remembers the choice', async ({ page }) => {
  await open(page, 'getting-started')
  const root = page.locator('html')
  await expect(root).toHaveAttribute('data-np-theme', 'glass')
  await page.locator('.np-theme-menu-trigger').click()
  await page.locator('.np-theme-menu-item', { hasText: 'Stock' }).click()
  await expect(root).toHaveAttribute('data-np-theme', 'stock')
  await page.reload()
  await expect(root).toHaveAttribute('data-np-theme', 'stock')
  await page.locator('.np-theme-menu-trigger').click()
  await expect(page.locator('.np-theme-menu-item', { hasText: 'Stock' })).toHaveAttribute('aria-checked', 'true')
})
