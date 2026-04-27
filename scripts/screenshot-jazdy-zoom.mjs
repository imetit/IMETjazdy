#!/usr/bin/env node
import { chromium } from 'playwright'

const BASE = 'http://localhost:3333'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.fill('input[type=email]', 'it@imet.sk')
await page.fill('input[type=password]', 'Admin123!')
await page.click('button[type=submit]')
await page.waitForURL(/^(?!.*login).*/, { timeout: 15000 })

await page.goto(`${BASE}/admin/jazdy`, { waitUntil: 'networkidle' })

// Zoom na ľavú časť tabuľky (prvé 3 stĺpce)
const table = await page.$('table')
const box = await table.boundingBox()
await page.screenshot({
  path: 'jazdy-zoom-left.png',
  clip: { x: box.x - 5, y: box.y - 5, width: 600, height: Math.min(400, box.height + 10) },
})

// Tiež full table zhora
await page.screenshot({
  path: 'jazdy-full.png',
  clip: { x: box.x - 5, y: box.y - 5, width: box.width + 10, height: Math.min(500, box.height + 10) },
})

console.log('Saved: jazdy-zoom-left.png, jazdy-full.png')
await browser.close()
