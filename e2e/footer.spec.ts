import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('the announcement bar renders above the header and its dismiss button hides it', async ({ page }) => {
  const errors = await open(page, 'getting-started')
  const bar = page.locator('.np-announce')
  await expect(bar).toBeVisible()
  await expect(bar.locator('.np-announce-text')).toContainText('Version 2.4')
  await bar.locator('.np-announce-dismiss').click()
  await expect(bar).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.np-announce')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('the announcement bar leaves when the reader scrolls past the header', async ({ page }) => {
  await open(page, 'frontmatter')
  await expect(page.locator('.np-announce')).toBeVisible()
  await page.locator('.np-main').evaluate((main) => main.scrollTo({ top: 400 }))
  await expect(page.locator('.np-announce')).toBeHidden()
  await page.locator('.np-main').evaluate((main) => main.scrollTo({ top: 0 }))
  await expect(page.locator('.np-announce')).toBeVisible()
})

test('a doc page carries previous and next links in sidebar order', async ({ page }) => {
  await open(page, 'frontmatter')
  const nav = page.locator('.np-footer-nav')
  await expect(nav).toBeVisible()
  await expect(nav.locator('.np-footer-prev')).toBeVisible()
  await expect(nav.locator('.np-footer-next')).toBeVisible()
  const nextTitle = await nav.locator('.np-footer-next .np-footer-nav-title').innerText()
  await nav.locator('.np-footer-next').click()
  await expect(page.locator('.np-footer-prev .np-footer-nav-title')).toHaveText('Frontmatter')
  expect(nextTitle.length).toBeGreaterThan(0)
})

test('the footer carries the copyright, the social link, and the generator line', async ({ page }) => {
  await open(page, 'getting-started')
  await expect(page.locator('.np-footer-copyright')).toHaveText('© 2026 Nimling')
  const social = page.locator('.np-footer-social-link')
  await expect(social).toHaveCount(1)
  await expect(social).toHaveAttribute('href', 'https://github.com/nimling/nimpress')
  await expect(social.locator('svg')).toBeVisible()
  await expect(page.locator('.np-footer-generator')).toContainText('Built with')
})

test('the site wide footer line renders on a doc page', async ({ page }) => {
  await open(page, 'getting-started')
  await expect(page.locator('.np-page-footer')).toContainText('Built from the docs folder')
})
