// Browser bench cez Playwright — simuluje reálneho usera s prefetch + cache.
// Spustenie: npx playwright install chromium && node scripts/bench-browser.mjs
//
// Vyžaduje v .env.local:
//   SCRIPT_TEST_EMAIL
//   SCRIPT_TEST_PASSWORD
//   BENCH_APP_URL (optional, default https://imetjazdy-work.vercel.app)

import { chromium } from 'playwright'
import { readFileSync } from 'fs'

function loadEnv() {
  if (process.env.SCRIPT_TEST_EMAIL) return
  try {
    const content = readFileSync('.env.local', 'utf8')
    for (const line of content.split('\n')) {
      const [key, ...vals] = line.split('=')
      if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
    }
  } catch {}
}
loadEnv()

const EMAIL = process.env.SCRIPT_TEST_EMAIL
const PASSWORD = process.env.SCRIPT_TEST_PASSWORD
const APP = process.env.BENCH_APP_URL || 'https://imetjazdy-work.vercel.app'

if (!EMAIL || !PASSWORD) {
  console.error('Missing SCRIPT_TEST_EMAIL or SCRIPT_TEST_PASSWORD env')
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

console.log('=== Login ===')
await page.goto(APP + '/login')
await page.fill('input[name="email"]', EMAIL)
await page.fill('input[name="password"]', PASSWORD)
await page.click('button[type="submit"]')
await page.waitForURL(/admin/)
console.log('  ✓ logged in')

async function measureClick(linkSelector, expectedUrl, label) {
  await page.evaluate(() => performance.clearMarks())
  const start = Date.now()
  await page.click(linkSelector)
  await page.waitForURL(expectedUrl, { timeout: 10000 })
  const navMs = Date.now() - start
  try {
    await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: 5000 })
  } catch {}
  const fullMs = Date.now() - start
  console.log(`  ${label.padEnd(40)} navigate ${navMs}ms · content visible ${fullMs}ms`)
}

console.log('\n=== Sidebar navigácia (real user) ===')
console.log('  Pozn: každý link má Next.js prefetch + SWR client cache.\n')

await measureClick('a[href="/admin/faktury"]', /faktury$/, 'klik 1: Faktúry (cold)')
await measureClick('a[href="/admin/faktury/dodavatelia"]', /dodavatelia/, 'klik 2: Dodávatelia (cold)')
await measureClick('a[href="/admin/faktury/reporty"]', /reporty/, 'klik 3: Reporty (cold)')
await measureClick('a[href="/admin/faktury"]', /faktury$/, 'klik 4: Faktúry (cache HIT!)')
await measureClick('a[href="/admin/faktury/dodavatelia"]', /dodavatelia/, 'klik 5: Dodávatelia (cache HIT!)')
await measureClick('a[href="/admin/faktury/reporty"]', /reporty/, 'klik 6: Reporty (cache HIT!)')

await browser.close()
