import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers'

test('an unknown address serves the not found page with its own title and actions', async ({ page }) => {
  const errors = watchErrors(page)
  const response = await page.goto('this/page/does/not/exist')
  expect(response?.status()).toBe(404)
  await expect(page.locator('.np-notfound-code')).toHaveText('404')
  await expect(page.locator('.np-notfound-title')).toHaveText('This page does not exist')
  await expect(page.locator('.np-notfound .np-action-primary').first()).toBeVisible()
  await expect(page.locator('.np-sidebar')).toBeVisible()
  await expect(page.locator('.np-toc-wrap')).toHaveCount(0)
  expect(errors.filter((message) => !message.includes('status of 404'))).toEqual([])
})

test('the not found page stays out of the sidebar and the sitemap', async ({ page, request }) => {
  await page.goto('')
  await expect(page.locator('.np-sidebar a[href="/nimpress/404"]')).toHaveCount(0)
  const sitemap = await (await request.get('sitemap.xml')).text()
  expect(sitemap).not.toContain('/nimpress/404')
})
