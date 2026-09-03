import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a tab group switches its panel on click', async ({ page }) => {
  const errors = await open(page, 'examples/tabs')
  const group = page.locator('.np-tabs').first()
  const tabs = group.locator('.np-tabs-tab')
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')
  await tabs.nth(1).click()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(group.locator('.np-tabs-panel:not([hidden])')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('a hash selects the tab it names on load', async ({ page }) => {
  await open(page, 'examples/tabs#tab-go')
  await expect(page.locator('#tab-go').first()).toHaveAttribute('aria-selected', 'true')
})

test('arrow keys move between tabs', async ({ page }) => {
  await open(page, 'examples/tabs')
  const tabs = page.locator('.np-tabs').first().locator('.np-tabs-tab')
  await tabs.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
})

test('a code group renders through the tabs component', async ({ page }) => {
  await open(page, 'examples/tabs')
  const group = page.locator('.np-code-group').first()
  await expect(group).toHaveClass(/np-tabs/)
  await expect(group.locator('.np-tabs-tab').first()).toBeVisible()
})
