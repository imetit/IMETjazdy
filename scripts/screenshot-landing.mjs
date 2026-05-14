import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

mkdirSync('e2e-screenshots', { recursive: true })

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

console.log('→ Landing /')
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)  // dať čas aurora animáciám aj reveal-up
await page.screenshot({ path: 'e2e-screenshots/landing-hero.png', fullPage: false })
await page.screenshot({ path: 'e2e-screenshots/landing-full.png', fullPage: true })

// Zoom na security section
const securityHandle = await page.locator('text=07 · Bezpečnosť').first()
await securityHandle.scrollIntoViewIfNeeded()
await page.waitForTimeout(800)
const securitySection = await page.locator('section').filter({ hasText: '13 / 13' }).first()
await securitySection.screenshot({ path: 'e2e-screenshots/landing-security.png' })

console.log('→ Login /login')
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: 'e2e-screenshots/login.png', fullPage: false })

await browser.close()
console.log('Saved to e2e-screenshots/')
