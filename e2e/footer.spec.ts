import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('the announcement renders as a notification and its dismiss button hides it', async ({ page }) => {
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

test('the announcement sits in the bottom right corner and takes no space above the header', async ({ page }) => {
  await open(page, 'frontmatter')
  const note = page.locator('.np-announce')
  await expect(note).toBeVisible()
  const box = await note.boundingBox()
  const viewport = page.viewportSize()
  expect(box && viewport && box.x + box.width > viewport.width - 40 && box.y + box.height > viewport.height - 40).toBe(true)
  const header = await page.locator('.np-header').boundingBox()
  expect(header?.y).toBe(0)
})

test('the sidebar toggle names and draws the state it will change', async ({ page }) => {
  await open(page, 'frontmatter')
  const toggle = page.locator('.np-menu-btn')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(toggle).toHaveAttribute('aria-label', 'Close sidebar')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toHaveAttribute('aria-label', 'Open sidebar')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
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
