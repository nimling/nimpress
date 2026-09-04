import { test, expect } from '@playwright/test'
import { open } from './helpers'

test('a doc page links to its source for editing and viewing', async ({ page }) => {
  const errors = await open(page, 'getting-started')
  const edit = page.locator('.np-page-action-edit')
  const view = page.locator('.np-page-action-view')
  await expect(edit).toHaveAttribute('href', 'https://github.com/nimling/nimpress/edit/main/docs/getting-started.md')
  await expect(view).toHaveAttribute('href', 'https://github.com/nimling/nimpress/blob/main/docs/getting-started.md')
  await expect(edit).toHaveAttribute('target', '_blank')
  expect(errors).toEqual([])
})

test('the feedback widget shows its ratings, reports the click, and shows the note', async ({ page }) => {
  await open(page, 'getting-started')
  const widget = page.locator('.np-feedback')
  await expect(widget).toBeVisible()
  await expect(widget.locator('.np-feedback-title')).toHaveText('Was this page helpful?')
  await expect(widget.locator('.np-feedback-rating')).toHaveCount(2)
  await page.evaluate(() => {
    document.addEventListener('nimpress:feedback', (event) => {
      ;(window as unknown as { feedback: unknown }).feedback = (event as CustomEvent).detail
    })
  })
  await widget.locator('.np-feedback-rating[data-value="0"]').click()
  await expect(widget.locator('.np-feedback-note')).toContainText('opening an issue')
  await expect(widget.locator('.np-feedback-rating')).toHaveCount(0)
  const detail = await page.evaluate(() => (window as unknown as { feedback: unknown }).feedback)
  expect(detail).toEqual({ path: '/getting-started', data: '0', name: 'This page could be improved' })
})

test('a page with feedback false shows no widget', async ({ page }) => {
  await open(page, 'examples/team')
  await expect(page.locator('.np-feedback')).toHaveCount(0)
})

test('a click posts the path, the data, and the name to the feedback endpoint', async ({ page }) => {
  let body: unknown = null
  await page.route('https://feedback.example.test/api/feedback', async (route) => {
    body = route.request().postDataJSON()
    await route.fulfill({ status: 204 })
  })
  await open(page, 'getting-started')
  await page.locator('.np-feedback-rating[data-value="1"]').click()
  await expect(page.locator('.np-feedback-note')).toContainText('Thanks for your feedback!')
  await expect.poll(() => body).toEqual({ path: '/getting-started', data: '1', name: 'This page was helpful' })
})
