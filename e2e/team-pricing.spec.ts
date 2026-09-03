import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a team page renders one card per member with a monogram, a role, a bio, and links', async ({ page }) => {
  const errors = await open(page, 'examples/team')
  const members = page.locator('.np-team-member')
  await expect(members).toHaveCount(3)
  const ada = members.filter({ hasText: 'Ada Lovelace' })
  await expect(ada.locator('.np-team-monogram')).toHaveText('AL')
  await expect(ada.locator('.np-team-role')).toHaveText('Founder')
  await expect(ada.locator('.np-team-bio code')).toHaveText('README')
  await expect(ada.locator('.np-team-link')).toHaveAttribute('href', 'https://github.com/nimling')
  await expect(page.locator('#member-grace-hopper')).toBeVisible()
  expect(await page.locator('.np-toc-wrap a[href$="#member-ada-lovelace"]').count()).toBeGreaterThan(0)
  expect(errors).toEqual([])
})

test('a pricing page renders the tiers with the middle one highlighted and the footnote below', async ({ page }) => {
  const errors = await open(page, 'examples/pricing')
  const tiers = page.locator('.np-pricing-tier')
  await expect(tiers).toHaveCount(3)
  await expect(tiers.nth(1)).toHaveClass(/np-pricing-tier-highlight/)
  await expect(tiers.nth(1).locator('.np-pricing-price')).toContainText('€49')
  await expect(tiers.nth(1).locator('.np-pricing-period')).toHaveText('per month')
  await expect(tiers.nth(1).locator('.np-pricing-benefit')).toHaveCount(3)
  await expect(tiers.nth(0).locator('.np-pricing-action')).toHaveClass(/np-pricing-action-secondary/)
  await expect(tiers.nth(0).locator('.np-pricing-action')).toHaveAttribute('href', '/nimpress/getting-started')
  await expect(page.locator('.np-pricing-footnote')).toContainText('placeholders')
  expect(errors).toEqual([])
})
