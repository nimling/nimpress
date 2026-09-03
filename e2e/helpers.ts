import { expect, type Page } from '@playwright/test'

export function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

export async function open(page: Page, route: string) {
  const errors = watchErrors(page)
  await page.goto(route)
  await expect(page.locator('.np-app')).toBeVisible()
  return errors
}
