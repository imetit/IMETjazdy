import { test, expect, Page, BrowserContext } from '@playwright/test'

/**
 * Cross-tenant isolation tests — overuje že admin firmy A NEVIDÍ dáta firmy B.
 *
 * Predpokladá 2 admin účty v rôznych firmách (PW_ADMIN_A_* a PW_ADMIN_B_*).
 * Pre solo development môžete oba zriadiť cez `/admin/zamestnanci` v rôznych
 * firmách.
 */

const ADMIN_A_EMAIL = process.env.PW_ADMIN_A_EMAIL || ''
const ADMIN_A_PASSWORD = process.env.PW_ADMIN_A_PASSWORD || ''
const ADMIN_B_EMAIL = process.env.PW_ADMIN_B_EMAIL || ''
const ADMIN_B_PASSWORD = process.env.PW_ADMIN_B_PASSWORD || ''

async function loginIn(ctx: BrowserContext, email: string, password: string): Promise<Page> {
  const page = await ctx.newPage()
  await page.goto('/login')
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', password)
  await page.click('button[type=submit]')
  await page.waitForURL(/^((?!\/login).)*$/, { timeout: 15_000 })
  return page
}

test.describe('Multi-tenant data isolation', () => {
  test.skip(!ADMIN_A_PASSWORD || !ADMIN_B_PASSWORD,
    'PW_ADMIN_A_* / PW_ADMIN_B_* not configured')

  test('admin firmy A and admin firmy B see different dashboard counts', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()

    const pageA = await loginIn(ctxA, ADMIN_A_EMAIL, ADMIN_A_PASSWORD)
    const pageB = await loginIn(ctxB, ADMIN_B_EMAIL, ADMIN_B_PASSWORD)

    await pageA.goto('/admin')
    await pageB.goto('/admin')

    // Extract "Aktívni zamestnanci" cards — should be firma-specific
    const aTextA = await pageA.locator('text=/Aktívni zamestnanci/').first().locator('..').textContent()
    const aTextB = await pageB.locator('text=/Aktívni zamestnanci/').first().locator('..').textContent()

    // Aspoň jedna metrika by mala byť rozdielna (ledže firmy majú rovnaký
    // počet všetkého, čo je krajne nepravdepodobné v reálnej DB).
    // Lepší test: sledovať konkrétny záznam v firme A a overiť že nie je vidieť
    // v B. Toto je placeholder.
    console.log('Firma A dashboard:', aTextA)
    console.log('Firma B dashboard:', aTextB)

    await ctxA.close(); await ctxB.close()
  })

  test('admin A cannot view faktura by ID from firma B', async ({ browser }) => {
    test.skip(!process.env.PW_FAKTURA_B_ID, 'Need a known faktura ID from firma B')
    const ctx = await browser.newContext()
    const page = await loginIn(ctx, ADMIN_A_EMAIL, ADMIN_A_PASSWORD)
    const r = await page.request.get(`/api/admin/faktury/${process.env.PW_FAKTURA_B_ID}`)
    expect([403, 404]).toContain(r.status())
    await ctx.close()
  })
})

test.describe('IDOR via direct API calls', () => {
  test('admin cannot anonymize user outside their firma via /api/gdpr/delete', async ({ browser }) => {
    test.skip(!ADMIN_A_PASSWORD || !process.env.PW_USER_B_ID,
      'Need admin A creds and a user ID from firma B')
    const ctx = await browser.newContext()
    const page = await loginIn(ctx, ADMIN_A_EMAIL, ADMIN_A_PASSWORD)
    const r = await page.request.post(`/api/gdpr/delete/${process.env.PW_USER_B_ID}`, {
      data: { reason: 'test cross-tenant', confirm: 'ANONYMIZE-PERMANENT' },
    })
    expect(r.status()).toBe(403)
    await ctx.close()
  })
})
