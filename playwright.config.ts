import { defineConfig, devices } from '@playwright/test'

const port = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}/nimpress/`,
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `PORT=${port} node scripts/serve-site.mjs`,
    url: `http://localhost:${port}/nimpress/`,
    reuseExistingServer: true,
    timeout: 30_000
  }
})
