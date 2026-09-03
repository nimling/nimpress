import { test, expect } from '@playwright/test'
import { open } from './helpers'

const full = (page: import('@playwright/test').Page) => page.locator('.np-code', { has: page.locator('.np-code-title', { hasText: 'main.ts' }) })

test('a title replaces the language label and the language becomes a tag', async ({ page }) => {
  const errors = await open(page, 'examples/code-blocks')
  const block = full(page)
  await expect(block.locator('.np-code-title')).toHaveText('main.ts')
  await expect(block.locator('.np-code-lang-tag')).toHaveText('ts')
  expect(errors).toEqual([])
})

test('line numbers count from the start and stay out of the code text', async ({ page }) => {
  await open(page, 'examples/code-blocks')
  const pre = full(page).locator('pre[data-lines]')
  await expect(pre).toHaveAttribute('data-start', '10')
  const counter = await pre.locator('code').evaluate((code) => getComputedStyle(code).counterReset)
  expect(counter).toBe('np-line 9')
  const before = await pre.locator('.line').first().evaluate((line) => getComputedStyle(line, '::before').content)
  expect(before).toContain('counter(np-line)')
  const text = await pre.locator('.line').first().evaluate((line) => (line as HTMLElement).innerText)
  expect(text.startsWith('const client')).toBe(true)
})

test('a highlighted line carries the highlight class and a background', async ({ page }) => {
  await open(page, 'examples/code-blocks')
  const line = full(page).locator('.np-code-line-highlight')
  await expect(line).toHaveCount(1)
  await expect(line).toContainText('client.get')
  const background = await line.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(background).not.toBe('rgba(0, 0, 0, 0)')
})

test('an annotation marker opens its tip on click and the list leaves the flow', async ({ page }) => {
  await open(page, 'examples/code-blocks')
  const block = full(page)
  const marker = block.locator('.np-code-annotation[data-annotation="1"]')
  await expect(marker).toBeVisible()
  await expect(page.locator('ol', { hasText: 'shared by every request on the page' })).toHaveCount(0)
  await marker.click()
  const tip = block.locator('.np-code-annotation-tip')
  await expect(tip).toBeVisible()
  await expect(tip).toContainText('shared by every request on the page')
  await marker.click()
  await expect(tip).toHaveCount(0)
})

test('a marker inside a string stays text and a stripped comment loses its comment characters', async ({ page }) => {
  await open(page, 'examples/code-blocks')
  const annotated = page.locator('.np-code', { hasText: "const label = 'attempt (1)'" }).first()
  await expect(annotated.locator('.np-code-annotation')).toHaveCount(1)
  const stripped = page.locator('.np-code', { has: page.locator('.np-code-title', { hasText: 'install.sh' }) })
  const text = await stripped.locator('.line').first().evaluate((line) => (line as HTMLElement).innerText)
  expect(text.trim()).toBe('pnpm install')
  await expect(stripped.locator('.np-code-annotation')).toHaveCount(1)
})
