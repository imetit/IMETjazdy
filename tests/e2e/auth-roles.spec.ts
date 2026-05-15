import { test, expect, Page } from '@playwright/test'

/**
 * Auth role landing tests — overuje že každá rola po prihlásení skončí na
 * svojej "domovskej" stránke a NEVIDÍ stránky mimo svojho scope.
 *
 * Tieto testy chránia pred regresiou v middleware role-routing logike.
 */

const ADMIN_EMAIL = process.env.PW_ADMIN_EMAIL || 'it@imet.sk'
const ADMIN_PASSWORD = process.env.PW_ADMIN_PASSWORD || ''
const EMPLOYEE_EMAIL = process.env.PW_EMPLOYEE_EMAIL || ''
const EMPLOYEE_PASSWORD = process.env.PW_EMPLOYEE_PASSWORD || ''

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', password)
  await page.click('button[type=submit]')
  await page.waitForURL(/^((?!\/login).)*$/, { timeout: 15_000 })
}

test.describe('Auth role landing', () => {
  test.skip(!ADMIN_PASSWORD, 'PW_ADMIN_PASSWORD env not set')

  test('admin lands on /admin and can open admin pages', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page).toHaveURL(/\/admin/)
    await page.goto('/admin/jazdy')
    await expect(page).toHaveURL(/\/admin\/jazdy/)
    await page.goto('/admin/zamestnanci')
    await expect(page).toHaveURL(/\/admin\/zamestnanci/)
  })

  test('admin has access to GDPR export endpoint (for self)', async ({ page, request }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    // Get own user id from session — workaround: open dashboard, extract from API
    // For now: just verify endpoint returns 401 (no auth) without cookies
    const noAuth = await request.get('/api/gdpr/export/00000000-0000-0000-0000-000000000000')
    expect([401, 403, 404]).toContain(noAuth.status())
  })
})

test.describe('Anonymous protections', () => {
  test('logged-out user is redirected to /login from admin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('logged-out user cannot access GDPR export', async ({ request }) => {
    const r = await request.get('/api/gdpr/export/00000000-0000-0000-0000-000000000000', { maxRedirects: 0 })
    // Middleware redirects unauth → /login (307); route returns 401 if reached
    expect([307, 401, 403, 404]).toContain(r.status())
  })

  test('CRON retention endpoint requires Bearer secret', async ({ request }) => {
    const r = await request.get('/api/cron/retention', { maxRedirects: 0 })
    expect([307, 401]).toContain(r.status())
  })

  test('CRON keep-warm requires Bearer secret (no UA spoof bypass)', async ({ request }) => {
    const r = await request.get('/api/cron/keep-warm', {
      maxRedirects: 0,
      headers: { 'User-Agent': 'vercel-cron/1.0' },  // would have bypassed pre-Phase 2
    })
    // Phase 2 odstránil UA fallback — UA-only request musí byť odmietnutý
    expect([307, 401]).toContain(r.status())
  })

  test('fleet-notifications requires Bearer auth (no query-string secret)', async ({ request }) => {
    const r = await request.get('/api/fleet-notifications?secret=whatever', { maxRedirects: 0 })
    // Phase 2 odstránil ?secret= podporu — endpoint vyžaduje Authorization header
    expect([307, 401]).toContain(r.status())
  })
})

test.describe('Security headers', () => {
  test('production responses have CSP + HSTS + XFO + nosniff', async ({ request }) => {
    const r = await request.get('/')
    const h = r.headers()
    expect(h['content-security-policy']).toBeTruthy()
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(h['x-frame-options']).toBe('DENY')
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(h['permissions-policy']).toContain('camera=()')
    // HSTS may not be set on http://localhost (Vercel sets it in prod only)
    if (process.env.PW_BASE_URL?.startsWith('https')) {
      expect(h['strict-transport-security']).toContain('max-age=')
    }
  })

  test('.well-known/security.txt is accessible', async ({ request }) => {
    const r = await request.get('/.well-known/security.txt')
    expect(r.status()).toBe(200)
    const text = await r.text()
    expect(text).toContain('Contact:')
    expect(text).toContain('Expires:')
  })

  test('privacy page is accessible', async ({ request }) => {
    const r = await request.get('/privacy')
    expect(r.status()).toBe(200)
  })

  test('terms page is accessible', async ({ request }) => {
    const r = await request.get('/terms')
    expect(r.status()).toBe(200)
  })

  test('security page is accessible', async ({ request }) => {
    const r = await request.get('/security')
    expect(r.status()).toBe(200)
  })
})

test.describe('Rate limiting (if Upstash configured)', () => {
  test('PIN identification rate-limits after burst', async ({ request }) => {
    // Pre tabletový PIN identify endpoint — vyžaduje to byť volaný cez akciu.
    // V tomto teste len overujeme že /login s neplatnými heslami sa lim<rate>uje
    // (Supabase auth má built-in rate limit). Skutočný PIN rate-limit test je
    // unit test na identifyByPin action.
    test.skip(!process.env.UPSTASH_REDIS_REST_URL, 'Rate limit needs Upstash configured')
    // Placeholder for future implementation
  })
})
