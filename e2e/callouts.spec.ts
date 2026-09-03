import { test, expect } from '@playwright/test'
import { open } from './helpers'

const types = ['tip', 'note', 'warning', 'info', 'check', 'abstract', 'success', 'question', 'failure', 'danger', 'bug', 'example', 'quote']

test('every callout type renders on the example page', async ({ page }) => {
  const errors = await open(page, 'examples/callouts')
  for (const type of types) {
    await expect(page.locator(`.np-callout-${type}`).first(), type).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('collapsible callouts start closed or open as declared', async ({ page }) => {
  await open(page, 'examples/callouts')
  const collapsible = page.locator('details.np-callout-collapsible')
  await expect(collapsible.first()).toBeVisible()
  const openBefore = await page.locator('details.np-callout-collapsible[open]').count()
  expect(openBefore).toBeGreaterThan(0)
  expect(await collapsible.count()).toBeGreaterThan(openBefore)
  await page.locator('details.np-callout-collapsible:not([open]) > summary').first().click()
  await expect(page.locator('details.np-callout-collapsible[open]')).toHaveCount(openBefore + 1)
})

test('an inline callout floats beside the following block', async ({ page }) => {
  await open(page, 'examples/callouts')
  await expect(page.locator('.np-callout-inline-end').first()).toBeVisible()
})

test('a nested callout renders inside its parent', async ({ page }) => {
  await open(page, 'examples/callouts')
  await expect(page.locator('.np-callout .np-callout').first()).toBeVisible()
})
