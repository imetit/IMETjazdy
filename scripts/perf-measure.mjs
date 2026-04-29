#!/usr/bin/env node
/**
 * Meria latencie navigácie a server actions cez Playwright.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3333'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext()
const page = await ctx.newPage()

console.log(`\nMeriam: ${BASE}\n`)

// Login
const t0 = Date.now()
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.fill('input[name=email]', 'demo.gr@imet.sk')
await page.fill('input[name=password]', 'Demo123!')
await page.click('button[type=submit]')
await page.waitForURL(/^(?!.*login).*/, { timeout: 15000 })
console.log(`Login + dashboard load: ${Date.now() - t0}ms`)

// Naviguj cez moduly
const pages = [
  '/admin/jazdy',
  '/admin/dovolenky',
  '/admin/sluzobne-cesty',
  '/admin/dochadzka',
  '/admin/archiv',
  '/admin/zamestnanci',
  '/admin/reporty',
  '/admin/nastavenia',
  '/fleet/vozidla',
  '/fleet/servisy',
]

for (const p of pages) {
  const start = Date.now()
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  const ttfb = Date.now() - start
  await page.waitForLoadState('networkidle')
  const total = Date.now() - start
  console.log(`${p.padEnd(30)} TTFB ${String(ttfb).padStart(4)}ms   Total ${String(total).padStart(4)}ms`)
}

// Klik na sidebar link (simuluje user navigáciu)
console.log('\nKlik cez sidebar (Link prefetch):')
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500) // počkaj na prefetch

for (const linkText of ['Prijaté jazdy', 'Schvaľovanie dovoleniek', 'Prehľad ciest', 'Dokumenty']) {
  const start = Date.now()
  await page.click(`a:has-text("${linkText}")`)
  await page.waitForLoadState('networkidle')
  console.log(`  klik "${linkText}": ${Date.now() - start}ms`)
}

await browser.close()
