import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a custom page type from the config renders the page with its own markup', async ({ page }) => {
  const errors = await open(page, 'examples/spotlight')
  await expect(page.locator('.spotlight-kicker')).toHaveText('Custom page type')
  await expect(page.locator('.spotlight-title')).toHaveText('Spotlight')
  await expect(page.locator('.spotlight .np-prose')).toContainText('rendered by')
  await expect(page.locator('.np-sidebar')).toBeVisible()
  expect(errors).toEqual([])
})
