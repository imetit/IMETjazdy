import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E config — security-focused test suite.
 *
 * Run: npx playwright test
 * UI mode: npx playwright test --ui
 *
 * Vyžaduje v .env.local:
 *   PW_BASE_URL (default http://localhost:3000)
 *   PW_ADMIN_EMAIL, PW_ADMIN_PASSWORD — admin (full scope) account
 *   PW_ADMIN_B_EMAIL, PW_ADMIN_B_PASSWORD — admin different firma (cross-tenant test)
 *   PW_EMPLOYEE_EMAIL, PW_EMPLOYEE_PASSWORD — zamestnanec role
 *   PW_TABLET_EMAIL, PW_TABLET_PASSWORD — tablet role
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,  // auth flow je zdieľaný state
  workers: 1,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } },
    },
  ],
})
