import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers'

test('every page in the sitemap renders without errors', async ({ page, request }) => {
  const sitemap = await (await request.get('sitemap.xml')).text()
  const routes = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => new URL(m[1]).pathname.replace(/^\/nimpress\//, ''))
  expect(routes.length).toBeGreaterThan(20)
  for (const route of routes) {
    const errors = watchErrors(page)
    await page.goto(route)
    await expect(page.locator('.np-app'), route).toBeVisible()
    expect((await page.locator('.np-main').innerText()).trim().length, route).toBeGreaterThan(0)
    expect(errors, route).toEqual([])
  }
})

test('an unknown route serves the not found page', async ({ page }) => {
  const response = await page.goto('does-not-exist')
  expect(response?.status()).toBe(404)
})
