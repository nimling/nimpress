import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a section page lists every child page as a card under its prose', async ({ page, request }) => {
  const errors = await open(page, 'page-types')
  await expect(page.locator('.np-prose h2').first()).toBeVisible()
  const cards = page.locator('.np-section-grid .np-card')
  const sitemap = await (await request.get('sitemap.xml')).text()
  const children = Array.from(sitemap.matchAll(/<loc>[^<]*\/nimpress\/page-types\/[^<\/]+<\/loc>/g)).length
  expect(children).toBeGreaterThan(5)
  expect(await cards.count()).toBe(children)
  await expect(cards.filter({ hasText: 'Section pages' })).toHaveAttribute('href', '/nimpress/page-types/section')
  expect(errors).toEqual([])
})

test('a section card carries the child description and leads to the page', async ({ page }) => {
  await open(page, 'page-types')
  const card = page.locator('.np-section-grid .np-card', { hasText: 'Doc pages' })
  await expect(card.locator('.np-card-body')).toContainText('default page type')
  await card.click()
  await expect(page).toHaveURL(/\/nimpress\/page-types\/doc$/)
})
