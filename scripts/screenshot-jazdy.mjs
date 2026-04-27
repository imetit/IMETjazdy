#!/usr/bin/env node
/**
 * Login as it@imet.sk and screenshot /admin/jazdy.
 * Highlights checkbox column to verify alignment.
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:3333'
const EMAIL = 'it@imet.sk'
const PASSWORD = 'Admin123!'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await ctx.newPage()

console.log('→ Otváram login...')
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })

console.log('→ Prihlasujem sa...')
await page.fill('input[type=email]', EMAIL)
await page.fill('input[type=password]', PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(/^(?!.*login).*/, { timeout: 15000 })

console.log('→ Otváram /admin/jazdy...')
await page.goto(`${BASE}/admin/jazdy`, { waitUntil: 'networkidle' })

console.log('→ Robím screenshot...')
await page.screenshot({ path: 'jazdy-screenshot.png', fullPage: false })

// Bonus: zmeraj presné pozície hlavičky a prvého riadku checkbox stĺpca
const measurements = await page.evaluate(() => {
  const ths = document.querySelectorAll('thead th')
  const firstTr = document.querySelector('tbody tr')
  const tds = firstTr ? firstTr.querySelectorAll('td') : []
  return {
    thead: Array.from(ths).slice(0, 4).map((el, i) => {
      const r = el.getBoundingClientRect()
      const child = el.firstElementChild?.getBoundingClientRect()
      return { idx: i, label: el.innerText.trim().slice(0, 20), x: Math.round(r.x), w: Math.round(r.width), childX: child ? Math.round(child.x) : null }
    }),
    tbody: Array.from(tds).slice(0, 4).map((el, i) => {
      const r = el.getBoundingClientRect()
      const child = el.firstElementChild?.getBoundingClientRect()
      return { idx: i, text: el.innerText.trim().slice(0, 20), x: Math.round(r.x), w: Math.round(r.width), childX: child ? Math.round(child.x) : null }
    }),
  }
})

console.log('\n=== HEADER stĺpce (prvé 4) ===')
console.table(measurements.thead)
console.log('\n=== BODY (1. riadok prvé 4 stĺpce) ===')
console.table(measurements.tbody)

console.log('\n→ Saved: jazdy-screenshot.png')
await browser.close()
