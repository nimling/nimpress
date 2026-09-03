import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a tagged page shows its tags with icons and each tag leads to the listing', async ({ page }) => {
  const errors = await open(page, 'getting-started')
  const row = page.locator('.np-tags')
  await expect(row).toBeVisible()
  const setup = row.locator('.np-tag', { hasText: 'Setup' })
  await expect(setup).toHaveAttribute('href', '/nimpress/tags#tag-setup')
  await expect(setup.locator('.np-tag-icon svg')).toBeVisible()
  await setup.click()
  await expect(page).toHaveURL(/\/nimpress\/tags#tag-setup$/)
  await expect(page.locator('#tag-setup .np-tags-heading')).toContainText('Setup')
  expect(errors).toEqual([])
})

test('the tags page lists every tag with its pages and the rail lists the tags', async ({ page }) => {
  await open(page, 'tags')
  const sections = page.locator('.np-tags-section')
  expect(await sections.count()).toBeGreaterThan(5)
  await expect(page.locator('#tag-page-types .np-tags-item a', { hasText: 'Tags page' })).toHaveAttribute('href', '/nimpress/page-types/tags')
  expect(await page.locator('.np-toc-wrap a[href$="#tag-setup"]').count()).toBeGreaterThan(0)
  await expect(page.locator('.np-tags')).toHaveCount(0)
})

test('hide tags drops the row on a page', async ({ page }) => {
  await open(page, '')
  await expect(page.locator('.np-tags')).toHaveCount(0)
})
