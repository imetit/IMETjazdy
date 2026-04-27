#!/usr/bin/env node
/**
 * IMET E2E WORKFLOW TEST — Playwright cez UI
 *
 * Testuje GOLDEN PATH celého systému z pohľadu reálnych užívateľov.
 * Predpoklad: dev server beží na localhost:3333 (alebo BASE env), demo dáta sú vyseedované.
 *
 * Scenarios:
 *  1. Login pre každú rolu (8 účtov)
 *  2. Zamestnanec → žiadosť o dovolenku
 *  3. Manager → schválenie + verifikácia auto-dochádzky
 *  4. Zamestnanec → nová jazda
 *  5. Účtovníčka → spracovanie jazdy
 *  6. Permissions check (zamestnanec sa nedostane na admin)
 *  7. Self-approval block
 *  8. Visual screenshots kľúčových stránok
 */

import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim()
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const BASE = process.env.BASE || 'http://localhost:3333'
const PASS = 'Demo123!'
const SCREENSHOT_DIR = 'e2e-screenshots'

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR)

const results = { passed: 0, failed: 0, errors: [] }
const log = (msg) => console.log(msg)
const ok = (msg) => { results.passed++; console.log(`  ✅ ${msg}`) }
const fail = (msg, err) => {
  results.failed++
  const m = err?.message || String(err)
  results.errors.push({ msg, err: m })
  console.log(`  ❌ ${msg}\n     → ${m}`)
}
const section = (t) => console.log(`\n══════════════════════════════════════\n  ${t}\n══════════════════════════════════════`)

const browser = await chromium.launch({ headless: true })

async function loginAs(email) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.fill('input[name=email]', email)
  await page.fill('input[name=password]', PASS)
  await page.click('button[type=submit]')
  await page.waitForURL(/^(?!.*login).*/, { timeout: 20000 })
  return { ctx, page }
}

async function shot(page, name) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false })
}

// ─── SCENARIO 1: Login každá rola ───
section('SCENARIO 1: Login pre každú rolu')

const allAccounts = [
  { email: 'demo.gr@imet.sk',       role: 'it_admin' },
  { email: 'demo.fin@imet.sk',      role: 'fin_manager' },
  { email: 'demo.uctovnik@imet.sk', role: 'admin' },
  { email: 'demo.fleet@imet.sk',    role: 'fleet_manager' },
  { email: 'demo.managerA@imet.sk', role: 'zamestnanec' },
  { email: 'demo.managerB@imet.sk', role: 'zamestnanec' },
  { email: 'demo.zam1@imet.sk',     role: 'zamestnanec' },
  { email: 'demo.zam3@imet.sk',     role: 'zamestnanec' },
]

for (const a of allAccounts) {
  try {
    const { ctx, page } = await loginAs(a.email)
    await shot(page, `dashboard-${a.role}-${a.email.split('@')[0]}`)
    ok(`Login ${a.email} (${a.role}) → dashboard ${page.url()}`)
    await ctx.close()
  } catch (err) { fail(`Login ${a.email}`, err) }
}

// ─── SCENARIO 2: Zamestnanec → žiadosť o dovolenku ───
section('SCENARIO 2: Zamestnanec dá žiadosť o dovolenku')

const ZAM_EMAIL = 'demo.zam3@imet.sk' // pod managerB (nie A — A je na dovolenke)
const futureFrom = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0] }
const dovOd = futureFrom(30)
const dovDo = futureFrom(34)
let testDovolenkaId = null

try {
  const { ctx, page } = await loginAs(ZAM_EMAIL)
  await page.goto(`${BASE}/dovolenka`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("Nová žiadosť")')
  await page.waitForSelector('input[name=datum_od]', { timeout: 10000 })
  await page.fill('input[name=datum_od]', dovOd)
  await page.fill('input[name=datum_do]', dovDo)
  await page.selectOption('select[name=typ]', 'dovolenka')
  await page.click('button[type=submit]:has-text("Odoslať")')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // DB verify
  const { data: emp } = await sb.from('profiles').select('id').eq('email', ZAM_EMAIL).single()
  const { data: dov } = await sb.from('dovolenky')
    .select('id, stav, schvalovatel_id, profile:profiles!schvalovatel_id(email)')
    .eq('user_id', emp.id).eq('datum_od', dovOd).single()
  if (!dov) throw new Error('Žiadosť sa nevytvorila v DB')
  testDovolenkaId = dov.id
  ok(`Žiadosť vytvorená: stav=${dov.stav}, schvalovatel=${dov.profile?.email}`)
  await shot(page, '02-dovolenka-vytvorena')
  await ctx.close()
} catch (err) { fail('Vytvorenie žiadosti', err) }

// ─── SCENARIO 3: Manager schváli žiadosť → over auto-dochádzku ───
section('SCENARIO 3: Manager schváli žiadosť + auto-dochádzka')

if (testDovolenkaId) {
  try {
    // Zistím schvaľovateľa
    const { data: dov } = await sb.from('dovolenky')
      .select('schvalovatel_id, profile:profiles!schvalovatel_id(email)')
      .eq('id', testDovolenkaId).single()
    const managerEmail = dov.profile.email

    const { ctx, page } = await loginAs(managerEmail)
    let alertMsg3 = ''
    page.on('dialog', async (d) => { alertMsg3 = d.message(); await d.dismiss() })
    await page.goto(`${BASE}/admin/dovolenky`, { waitUntil: 'networkidle' })
    await shot(page, '03-admin-dovolenky-pred')

    // Klik na schvaľovacie tlačidlo na riadku s našou žiadosťou
    // Žiadosť má dátum dovOd (futureFrom(30)), v tabuľke formátovaný sk-SK
    const dateLabel = new Date(dovOd).toLocaleDateString('sk-SK')
    const targetRow = page.locator(`tr:has-text("${dateLabel}")`).first()
    await targetRow.waitFor({ timeout: 10000 })
    const approveBtn = targetRow.locator('button[title="Schváliť"]')
    await approveBtn.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // server action delay
    if (alertMsg3) console.log(`     (alert: ${alertMsg3})`)

    // Verify v DB
    const { data: after } = await sb.from('dovolenky').select('stav').eq('id', testDovolenkaId).single()
    if (after.stav !== 'schvalena') throw new Error(`Stav neaktualizovaný: ${after.stav}`)
    ok(`Schválenie cez UI: stav=${after.stav}`)

    // Over auto-dochádzku
    const { data: emp } = await sb.from('profiles').select('id').eq('email', ZAM_EMAIL).single()
    const { data: doch } = await sb.from('dochadzka')
      .select('datum, smer, dovod, zdroj')
      .eq('user_id', emp.id)
      .eq('dovod', 'dovolenka')
      .gte('datum', dovOd).lte('datum', dovDo)
    const expected = countWorkdays(dovOd, dovDo) * 2
    if (doch.length !== expected) {
      throw new Error(`Dochádzka záznamov: ${doch.length}, očakávaných ${expected}`)
    }
    if (!doch.every(r => r.zdroj === 'system')) throw new Error('Nie všetky majú zdroj=system')
    ok(`Auto-flow: ${doch.length} dochádzkových záznamov (${expected} očakávaných, všetky zdroj=system)`)
    await shot(page, '03-admin-dovolenky-po')
    await ctx.close()
  } catch (err) { fail('Schválenie / auto-dochádzka', err) }
}

function countWorkdays(from, to) {
  let n = 0
  const d = new Date(from)
  const end = new Date(to)
  while (d <= end) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) n++
    d.setDate(d.getDate() + 1)
  }
  return n
}

// ─── SCENARIO 4: Zamestnanec → nová jazda ───
section('SCENARIO 4: Zamestnanec vytvorí jazdu')

let testJazdaId = null
try {
  const { ctx, page } = await loginAs('demo.zam2@imet.sk')
  await page.goto(`${BASE}/nova-jazda`, { waitUntil: 'networkidle' })
  await shot(page, '04-nova-jazda-form')

  // JazdaForm má iba mesiac + km, tlačidlo "Odoslať" je onClick (nie submit)
  await page.fill('input[name=mesiac]', new Date().toISOString().slice(0, 7))
  await page.fill('input[name=km]', '50')
  await page.click('button:has-text("Odoslať")')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Verify
  const { data: emp } = await sb.from('profiles').select('id').eq('email', 'demo.zam2@imet.sk').single()
  const { data: jazdy } = await sb.from('jazdy').select('id, km, stav')
    .eq('user_id', emp.id).eq('km', 50).order('created_at', { ascending: false }).limit(1)
  if (!jazdy?.length) throw new Error('Jazda sa nevytvorila v DB')
  testJazdaId = jazdy[0].id
  ok(`Jazda vytvorená: id=${testJazdaId}, stav=${jazdy[0].stav}`)
  await ctx.close()
} catch (err) { fail('Vytvorenie jazdy', err) }

// ─── SCENARIO 5: Účtovníčka → admin/jazdy + visual ───
section('SCENARIO 5: Účtovníčka vidí jazdy v admin paneli')

try {
  const { ctx, page } = await loginAs('demo.uctovnik@imet.sk')
  await page.goto(`${BASE}/admin/jazdy`, { waitUntil: 'networkidle' })
  await shot(page, '05-admin-jazdy-uctovnik')

  // Kontrola že vidí riadky
  const rowCount = await page.locator('tbody tr').count()
  if (rowCount === 0) throw new Error('Žiadne jazdy v zozname')
  ok(`Účtovníčka vidí ${rowCount} jázd v admin paneli`)
  await ctx.close()
} catch (err) { fail('Účtovníčka admin/jazdy', err) }

// ─── SCENARIO 6: Permissions — zamestnanec sa nedostane na admin ───
section('SCENARIO 6: Permissions — RLS / role check')

const permTests = [
  { email: 'demo.zam1@imet.sk', url: '/admin/zamestnanci', shouldAccess: false, label: 'Zamestnanec → /admin/zamestnanci' },
  { email: 'demo.zam1@imet.sk', url: '/admin/jazdy', shouldAccess: false, label: 'Zamestnanec → /admin/jazdy' },
  { email: 'demo.fleet@imet.sk', url: '/admin/zamestnanci', shouldAccess: false, label: 'Fleet → /admin/zamestnanci' },
  { email: 'demo.fleet@imet.sk', url: '/fleet/vozidla', shouldAccess: true, label: 'Fleet → /fleet/vozidla' },
  { email: 'demo.fin@imet.sk', url: '/admin/dovolenky', shouldAccess: true, label: 'Fin manager → /admin/dovolenky' },
  { email: 'demo.gr@imet.sk', url: '/admin/zamestnanci', shouldAccess: true, label: 'GR (it_admin) → /admin/zamestnanci' },
]

for (const t of permTests) {
  try {
    const { ctx, page } = await loginAs(t.email)
    const resp = await page.goto(`${BASE}${t.url}`, { waitUntil: 'domcontentloaded' })
    const finalUrl = page.url()
    const accessed = !finalUrl.includes('/login') && !finalUrl.endsWith('/')
    // /admin redirected na / pre zamestnanca = nedostal sa
    const reachedTarget = finalUrl.includes(t.url.split('/')[1]) && !finalUrl.includes('login')

    if (t.shouldAccess) {
      // Mal mať prístup — overiť že URL obsahuje target path
      const ok_ = finalUrl.includes(t.url.replace(/\/$/, ''))
      if (!ok_) throw new Error(`Mal mať prístup, ale URL je ${finalUrl}`)
      ok(t.label + ` ✓ access (URL: ${finalUrl})`)
    } else {
      // Nemal mať prístup — overiť že bol redirectnutý
      const blocked = !finalUrl.includes(t.url.replace(/\/$/, '')) || finalUrl === `${BASE}/` || finalUrl.includes('login')
      if (!blocked) throw new Error(`Mal byť zablokovaný, ale dostal sa na ${finalUrl}`)
      ok(t.label + ` ✓ blocked (redirect: ${finalUrl})`)
    }
    await ctx.close()
  } catch (err) { fail(t.label, err) }
}

// ─── SCENARIO 7: Self-approval block ───
section('SCENARIO 7: Self-approval block')

try {
  // Vytvor dovolenku pre managera kde manager = jeho vlastný schvaľovateľ
  const { data: gr } = await sb.from('profiles').select('id').eq('email', 'demo.gr@imet.sk').single()
  const { data: selfDov } = await sb.from('dovolenky').insert({
    user_id: gr.id, datum_od: futureFrom(50), datum_do: futureFrom(50),
    typ: 'dovolenka', stav: 'caka_na_schvalenie', schvalovatel_id: gr.id, // sám sebe!
  }).select().single()

  // Pokus schváliť cez UI ako GR
  const { ctx, page } = await loginAs('demo.gr@imet.sk')
  await page.goto(`${BASE}/admin/dovolenky`, { waitUntil: 'networkidle' })

  // Nastavím handler na alert (server action vracia error → DovolenkySchvalovanie volá alert)
  let alertMsg = ''
  page.on('dialog', async (d) => { alertMsg = d.message(); await d.dismiss() })

  // Skús schváliť (button title="Schváliť" pre tú konkrétnu žiadosť)
  // Vyhľadám riadok kde je obdobie = futureFrom(50)
  const dateLabel = new Date(futureFrom(50)).toLocaleDateString('sk-SK')
  const row = page.locator(`tr:has-text("${dateLabel}")`).first()
  if (await row.count() > 0) {
    const btn = row.locator('button[title="Schváliť"]')
    if (await btn.count() > 0) await btn.click()
    await page.waitForTimeout(1500)
  }

  // Verify v DB — stav by mal ostať caka_na_schvalenie
  const { data: after } = await sb.from('dovolenky').select('stav').eq('id', selfDov.id).single()
  if (after.stav === 'schvalena') throw new Error('BUG: self-approval prešiel!')
  ok(`Self-approval BLOKOVANÝ (stav ostal: ${after.stav}${alertMsg ? `, alert: ${alertMsg}` : ''})`)

  // Cleanup
  await sb.from('dovolenky').delete().eq('id', selfDov.id)
  await ctx.close()
} catch (err) { fail('Self-approval block test', err) }

// ─── SCENARIO 8: Visual screenshots kľúčových stránok ───
section('SCENARIO 8: Visual screenshots všetkých kľúčových stránok')

const visualPages = [
  { email: 'demo.gr@imet.sk', url: '/admin', name: 'admin-dashboard' },
  { email: 'demo.gr@imet.sk', url: '/admin/zamestnanci', name: 'admin-zamestnanci' },
  { email: 'demo.gr@imet.sk', url: '/admin/jazdy', name: 'admin-jazdy' },
  { email: 'demo.gr@imet.sk', url: '/admin/dovolenky', name: 'admin-dovolenky' },
  { email: 'demo.gr@imet.sk', url: '/admin/sluzobne-cesty', name: 'admin-cesty' },
  { email: 'demo.gr@imet.sk', url: '/admin/dochadzka', name: 'admin-dochadzka' },
  { email: 'demo.gr@imet.sk', url: '/admin/archiv', name: 'admin-archiv' },
  { email: 'demo.gr@imet.sk', url: '/admin/reporty', name: 'admin-reporty' },
  { email: 'demo.gr@imet.sk', url: '/admin/nastavenia', name: 'admin-nastavenia' },
  { email: 'demo.gr@imet.sk', url: '/admin/manual', name: 'admin-manual' },
  { email: 'demo.fleet@imet.sk', url: '/fleet/vozidla', name: 'fleet-vozidla' },
  { email: 'demo.fleet@imet.sk', url: '/fleet/servisy', name: 'fleet-servisy' },
  { email: 'demo.fleet@imet.sk', url: '/fleet/kontroly', name: 'fleet-kontroly' },
  { email: 'demo.fleet@imet.sk', url: '/fleet/tankove-karty', name: 'fleet-karty' },
  { email: 'demo.zam1@imet.sk', url: '/', name: 'zamestnanec-dashboard' },
  { email: 'demo.zam1@imet.sk', url: '/dovolenka', name: 'zamestnanec-dovolenka' },
  { email: 'demo.zam1@imet.sk', url: '/dochadzka-prehled', name: 'zamestnanec-dochadzka' },
  { email: 'demo.zam1@imet.sk', url: '/sluzobna-cesta', name: 'zamestnanec-cesta' },
  { email: 'demo.zam1@imet.sk', url: '/moja-karta', name: 'zamestnanec-karta' },
  { email: 'demo.zam1@imet.sk', url: '/notifikacie', name: 'zamestnanec-notif' },
]

let ctx = null, page = null, currentEmail = null
for (const p of visualPages) {
  try {
    if (currentEmail !== p.email) {
      if (ctx) await ctx.close()
      const session = await loginAs(p.email)
      ctx = session.ctx; page = session.page
      currentEmail = p.email
    }
    const resp = await page.goto(`${BASE}${p.url}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(800) // stabilizácia
    await shot(page, `08-${p.name}`)
    const status = resp?.status() ?? 'unknown'
    ok(`${p.name.padEnd(30)} ${p.url} → ${status}`)
  } catch (err) { fail(`${p.name} ${p.url}`, err) }
}
if (ctx) await ctx.close()

// ─── SUMMARY ───
await browser.close()

console.log('\n╔══════════════════════════════════════════════════╗')
console.log(`║  WORKFLOW: ${String(results.passed).padStart(3)} passed, ${String(results.failed).padStart(3)} failed       ║`)
console.log('╚══════════════════════════════════════════════════╝')

if (results.errors.length) {
  console.log('\n❌ FAILED:')
  for (const e of results.errors) console.log(`  - ${e.msg}\n    → ${e.err}`)
}

console.log(`\n📷 Screenshots: ${SCREENSHOT_DIR}/\n`)
process.exit(results.failed > 0 ? 1 : 0)
