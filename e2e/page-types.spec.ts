import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('the hero example renders the band', async ({ page }) => {
  const errors = await open(page, 'examples/hero')
  await expect(page.locator('.np-hero')).toBeVisible()
  expect(errors).toEqual([])
})

test('the changelog collection expands an entry from its hash', async ({ page }) => {
  const errors = await open(page, 'changelog#v2.4.0')
  await expect(page.locator('.np-changelog-entry-heading').first()).toBeVisible()
  await expect(page.locator('.np-changelog-entry-title', { hasText: 'Seven new page types' })).toBeVisible()
  expect(errors).toEqual([])
})

test('the openapi example lists operations', async ({ page }) => {
  const errors = await open(page, 'examples/openapi')
  await expect(page.locator('.np-op-summary').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('the mermaid example renders a diagram', async ({ page }) => {
  const errors = await open(page, 'examples/mermaid')
  await expect(page.locator('.np-mermaid-stage svg').first()).toBeVisible({ timeout: 15_000 })
  expect(errors).toEqual([])
})

test('the schema viewer mounts the diagram behind its shield', async ({ page }) => {
  const errors = await open(page, 'examples/schema-viewer')
  await expect(page.locator('.np-dbml-host').first()).toBeVisible({ timeout: 15_000 })
  expect(errors).toEqual([])
})
