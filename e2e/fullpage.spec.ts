import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a full page renders the band and none of the shell chrome', async ({ page }) => {
  const errors = await open(page, 'examples/fullpage')
  await expect(page.locator('.np-fullpage-band .np-fullpage-title')).toHaveText('Full page')
  await expect(page.locator('.np-fullpage-eyebrow')).toHaveText('Example')
  await expect(page.locator('.np-app')).toHaveClass(/np-navigation-hidden/)
  await expect(page.locator('.np-sidebar')).toHaveCount(0)
  await expect(page.locator('.np-crumbs')).toHaveCount(0)
  await expect(page.locator('.np-toc-wrap')).toHaveCount(0)
  await expect(page.locator('.np-footer-nav')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('the body spans the main column and carries the section blocks', async ({ page }) => {
  await open(page, 'examples/fullpage')
  await expect(page.locator('.np-fullpage-body .np-action-primary').first()).toBeVisible()
  await expect(page.locator('.np-fullpage-body .np-feature-card').first()).toBeVisible()
  const main = await page.locator('.np-main').boundingBox()
  const body = await page.locator('.np-fullpage-body .np-page').boundingBox()
  expect(body && main && body.width > main.width * 0.9).toBe(true)
})
