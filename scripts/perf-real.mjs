#!/usr/bin/env node
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'https://imetjazdy-work.vercel.app'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext()
const page = await ctx.newPage()

// Login
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[name=email]', 'demo.gr@imet.sk')
await page.fill('input[name=password]', 'Demo123!')
await page.click('button[type=submit]')
await page.waitForURL(/^(?!.*login).*/, { timeout: 15000 })

const pages = [
  '/admin/dochadzka',
  '/admin/jazdy',
  '/admin/dovolenky',
  '/admin/zamestnanci',
  '/admin/archiv',
]

console.log(`Real perceived load (TTFB + DOM):`)
for (const p of pages) {
  // Warm
  await page.goto(`${BASE}${p}`, { waitUntil: 'load', timeout: 30000 })

  // Measure
  const start = Date.now()
  await page.goto(`${BASE}${p}`, { waitUntil: 'commit' })
  const ttfb = Date.now() - start
  await page.waitForLoadState('domcontentloaded')
  const dcl = Date.now() - start
  await page.waitForLoadState('load')
  const load = Date.now() - start
  console.log(`${p.padEnd(28)} TTFB ${String(ttfb).padStart(4)}ms · DCL ${String(dcl).padStart(4)}ms · Load ${String(load).padStart(4)}ms`)
}

await browser.close()
