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

console.log('→ Login /login')
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: 'e2e-screenshots/login.png', fullPage: false })

await browser.close()
console.log('Saved to e2e-screenshots/')
