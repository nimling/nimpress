import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a glossary term in the prose of another page shows its definition on hover', async ({ page }) => {
  const errors = await open(page, 'page-types/doc')
  const abbr = page.locator('.np-prose abbr.np-abbr').first()
  await expect(abbr).toBeVisible()
  const definition = await abbr.getAttribute('aria-label')
  expect(definition?.length).toBeGreaterThan(10)
  await abbr.hover()
  await expect(page.locator('.np-tooltip')).toBeVisible()
  await expect(page.locator('.np-tooltip')).toHaveText(definition ?? '')
  expect(errors).toEqual([])
})

test('a titled link, a footnote reference, and a local abbreviation show tooltips', async ({ page }) => {
  await open(page, 'examples/formatting')
  const link = page.locator('.np-prose a.np-tip', { hasText: 'the nimpress repository' })
  await expect(link).toHaveAttribute('aria-label', 'Opens the repository on GitHub')
  await expect(link).not.toHaveAttribute('title', /.+/)
  const footnote = page.locator('.np-prose sup.footnote-ref.np-tip').first()
  await expect(footnote).toHaveAttribute('aria-label', /Footnotes render at the bottom/)
  const local = page.locator('.np-prose abbr.np-abbr', { hasText: 'W3C' })
  await expect(local).toHaveAttribute('aria-label', 'World Wide Web Consortium')
  await local.hover()
  await expect(page.locator('.np-tooltip')).toHaveText('World Wide Web Consortium')
})

test('the glossary page anchors every term and lists them in the rail', async ({ page }) => {
  await open(page, 'glossary#term-token')
  await expect(page.locator('#term-token')).toBeVisible()
  await expect(page.locator('.np-prose abbr.np-abbr')).toHaveCount(0)
  expect(await page.locator('.np-toc-wrap a[href$="#term-token"]').count()).toBeGreaterThan(0)
})
