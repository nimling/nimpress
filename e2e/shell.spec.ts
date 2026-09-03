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

test('the theme toggle switches the dark class', async ({ page }) => {
  await open(page, 'getting-started')
  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  await page.locator('button[aria-label="Toggle theme"]').click()
  const after = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  expect(after).not.toBe(before)
})

