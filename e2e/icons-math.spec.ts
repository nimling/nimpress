import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('lucide icons, custom icons, and emoji render from shortcodes', async ({ page }) => {
  const errors = await open(page, 'examples/icons-math')
  const prose = page.locator('.np-prose')
  await expect(prose.locator('.np-icon[data-icon="lucide-braces"] svg')).toBeVisible()
  await expect(prose.locator('.np-icon[data-icon="nim"] svg')).toBeVisible()
  await expect(prose.getByText('Ship it 🚀 and celebrate 🎉.')).toBeVisible()
  expect(errors).toEqual([])
})

test('an icon takes classes from its braces and an unknown shortcode stays as text', async ({ page }) => {
  await open(page, 'examples/icons-math')
  const heart = page.locator('.np-icon[data-icon="lucide-heart"]')
  await expect(heart).toHaveClass(/lg/)
  await expect(heart).toHaveClass(/brand/)
  await expect(page.locator('.np-prose').getByText(':lucide-not-a-real-icon: stays as text')).toBeVisible()
})

test('display and inline math render as MathML', async ({ page }) => {
  await open(page, 'examples/icons-math')
  await expect(page.locator('.np-math-display math').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('span.np-math math').first()).toBeVisible()
  await expect(page.locator('.np-prose').getByText('a price of $5 stays a price')).toBeVisible()
})
