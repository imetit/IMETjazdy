#!/usr/bin/env node
/**
 * Detailný screenshot s pixel-merným reportom — overí vertikálne a horizontálne zarovnanie.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3333'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.fill('input[type=email]', 'it@imet.sk')
await page.fill('input[type=password]', 'Admin123!')
await page.click('button[type=submit]')
await page.waitForURL(/^(?!.*login).*/, { timeout: 20000 })

await page.goto(`${BASE}/admin/jazdy`, { waitUntil: 'networkidle' })

// Detailné meranie každej cell vertikálne
const data = await page.evaluate(() => {
  const rows = []
  // Header
  const headerCells = document.querySelectorAll('thead tr:first-child > th')
  const headerRow = []
  headerCells.forEach((th, i) => {
    const r = th.getBoundingClientRect()
    const child = th.firstElementChild?.getBoundingClientRect()
    headerRow.push({
      col: i, label: th.innerText.trim().slice(0, 14) || '(empty)',
      th_y: Math.round(r.y), th_h: Math.round(r.height),
      content_y: child ? Math.round(child.y) : null,
      content_h: child ? Math.round(child.height) : null,
      content_centerY: child ? Math.round(child.y + child.height / 2) : null,
    })
  })
  rows.push({ row: 'HEADER', cells: headerRow })

  // First 3 body rows
  const bodyRows = document.querySelectorAll('tbody tr')
  Array.from(bodyRows).slice(0, 3).forEach((tr, ri) => {
    const tds = tr.querySelectorAll('td')
    const r = []
    tds.forEach((td, i) => {
      const rect = td.getBoundingClientRect()
      const child = td.firstElementChild?.getBoundingClientRect()
      r.push({
        col: i, text: td.innerText.trim().slice(0, 14) || '(empty)',
        td_y: Math.round(rect.y), td_h: Math.round(rect.height),
        content_y: child ? Math.round(child.y) : null,
        content_h: child ? Math.round(child.height) : null,
        content_centerY: child ? Math.round(child.y + child.height / 2) : null,
      })
    })
    rows.push({ row: `ROW${ri}`, cells: r })
  })
  return rows
})

console.log('\n=== VERTIKÁLNE ZAROVNANIE (centerY musí byť rovnaké pre všetky stĺpce v 1 riadku) ===')
for (const row of data) {
  console.log(`\n${row.row}:`)
  console.table(row.cells)
}

// Cropnutý screenshot
const table = await page.$('table')
const box = await table.boundingBox()
await page.screenshot({
  path: 'jazdy-detail.png',
  clip: { x: box.x, y: box.y, width: 700, height: Math.min(450, box.height) },
})

console.log('\n→ Saved: jazdy-detail.png')
await browser.close()
