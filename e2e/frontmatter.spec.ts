import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('hide toc drops the right rail on the home page', async ({ page }) => {
  await open(page, '')
  await expect(page.locator('.np-hero')).toBeVisible()
  await expect(page.locator('.np-toc')).toHaveCount(0)
})

test('a page status renders as a mark on its sidebar row', async ({ page }) => {
  await open(page, 'examples/callouts')
  const mark = page.locator('.np-sidebar-status').first()
  await expect(mark).toBeVisible()
  await expect(mark).toHaveAttribute('title', 'Recently added')
})
