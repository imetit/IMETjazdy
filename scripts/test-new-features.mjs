#!/usr/bin/env node
/**
 * Test script for all new features added 2026-04-17.
 * Signs in as it@imet.sk and tests each module.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yotjzvykdpxkwfegjrkr.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  // Try loading from .env.local
  const fs = await import('fs')
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const supabase = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

let passed = 0
let failed = 0
const errors = []

async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  ✅ ${name}`)
  } catch (err) {
    failed++
    const msg = err.message || String(err)
    errors.push({ name, error: msg })
    console.log(`  ❌ ${name}: ${msg}`)
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

console.log('\n══════════════════════════════════════')
console.log('  IMET System — Test New Features')
console.log('══════════════════════════════════════\n')

// ═══ 1. DATABASE TABLES ═══
console.log('📦 1. Database — New Tables')

await test('archiv_kategorie exists + has 7 default categories', async () => {
  const { data, error } = await supabase.from('archiv_kategorie').select('*')
  assert(!error, `Query error: ${error?.message}`)
  assert(data.length >= 7, `Expected >= 7 categories, got ${data.length}`)
})

await test('vozidlo_tankovanie table exists', async () => {
  const { error } = await supabase.from('vozidlo_tankovanie').select('id').limit(1)
  assert(!error, `Query error: ${error?.message}`)
})

await test('tankove_karty table exists', async () => {
  const { error } = await supabase.from('tankove_karty').select('id').limit(1)
  assert(!error, `Query error: ${error?.message}`)
})

await test('onboarding_items table exists', async () => {
  const { error } = await supabase.from('onboarding_items').select('id').limit(1)
  assert(!error, `Query error: ${error?.message}`)
})

await test('skolenia table exists', async () => {
  const { error } = await supabase.from('skolenia').select('id').limit(1)
  assert(!error, `Query error: ${error?.message}`)
})

// ═══ 2. EXTENDED COLUMNS ═══
console.log('\n📦 2. Database — Extended Columns')

await test('dokumenty_archiv has verzia, povodny_dokument_id, platnost_do, kategoria_id', async () => {
  const { data, error } = await supabase.from('dokumenty_archiv').select('verzia, povodny_dokument_id, platnost_do, kategoria_id').limit(1)
  assert(!error, `Missing columns: ${error?.message}`)
})

await test('vozidlo_servisy has nasledny_servis_km, nasledny_servis_datum', async () => {
  const { data, error } = await supabase.from('vozidlo_servisy').select('nasledny_servis_km, nasledny_servis_datum').limit(1)
  assert(!error, `Missing columns: ${error?.message}`)
})

await test('cesta_doklady has stav column', async () => {
  const { data, error } = await supabase.from('cesta_doklady').select('stav').limit(1)
  assert(!error, `Missing stav column: ${error?.message}`)
})

await test('sluzobne_cesty has vyuctovanie_stav column', async () => {
  const { data, error } = await supabase.from('sluzobne_cesty').select('vyuctovanie_stav').limit(1)
  assert(!error, `Missing vyuctovanie_stav: ${error?.message}`)
})

await test('profiles has offboarding_stav column', async () => {
  const { data, error } = await supabase.from('profiles').select('offboarding_stav').limit(1)
  assert(!error, `Missing offboarding_stav: ${error?.message}`)
})

await test('poistne_udalosti has financial columns', async () => {
  const { data, error } = await supabase.from('poistne_udalosti').select('cislo_poistky, skoda_odhad, skoda_skutocna, poistovna_plnenie, spoluucast').limit(1)
  assert(!error, `Missing financial columns: ${error?.message}`)
})

// ═══ 3. STORAGE BUCKET ═══
console.log('\n📦 3. Storage — Buckets')

await test('skolenia-certifikaty bucket exists', async () => {
  const { data, error } = await supabase.storage.from('skolenia-certifikaty').list('', { limit: 1 })
  assert(!error, `Bucket error: ${error?.message}`)
})

// ═══ 4. ARCHIV KATEGORIE ═══
console.log('\n📁 4. Archive Categories')

await test('Default categories have correct data', async () => {
  const { data } = await supabase.from('archiv_kategorie').select('nazov, pristup_role, poradie').order('poradie')
  const names = data.map(d => d.nazov)
  assert(names.includes('Zmluvy') || names.includes('Zmluvy'), `Missing Zmluvy category`)
  assert(names.includes('Ostatné') || names.includes('Ostatne'), `Missing Ostatne category`)
  // Check roles
  const zmluvy = data.find(d => d.nazov.includes('mluv'))
  if (zmluvy) {
    assert(zmluvy.pristup_role.includes('fin_manager'), 'Zmluvy should include fin_manager role')
  }
})

// ═══ 5. PROFILES INTEGRATION ═══
console.log('\n👤 5. Profiles — New Fields')

await test('IT admin (it@imet.sk) exists and has correct role', async () => {
  const { data } = await supabase.from('profiles').select('id, role, email, ical_token').eq('email', 'it@imet.sk').single()
  assert(data, 'IT admin profile not found')
  assert(data.role === 'it_admin', `Expected it_admin role, got ${data.role}`)
})

await test('Profiles have firma_id field', async () => {
  const { data, error } = await supabase.from('profiles').select('firma_id').limit(1)
  assert(!error, `Missing firma_id: ${error?.message}`)
})

// ═══ 6. ONBOARDING TEST ═══
console.log('\n📋 6. Onboarding — Create & Read')

await test('Can insert and read onboarding items', async () => {
  // Get any active profile
  const { data: profile } = await supabase.from('profiles').select('id').eq('active', true).limit(1).single()
  assert(profile, 'No active profile found')

  // Insert test item
  const { error: insertErr } = await supabase.from('onboarding_items').insert({
    profile_id: profile.id,
    typ: 'test',
    nazov: 'TEST - automatický test',
    splnene: false,
  })
  assert(!insertErr, `Insert error: ${insertErr?.message}`)

  // Read back
  const { data: items, error: readErr } = await supabase.from('onboarding_items')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('typ', 'test')
  assert(!readErr, `Read error: ${readErr?.message}`)
  assert(items.length > 0, 'No items returned')

  // Cleanup
  await supabase.from('onboarding_items').delete().eq('typ', 'test').eq('profile_id', profile.id)
})

// ═══ 7. SKOLENIA TEST ═══
console.log('\n🎓 7. Školenia — Create & Read')

await test('Can insert and read skolenia', async () => {
  const { data: profile } = await supabase.from('profiles').select('id').eq('active', true).limit(1).single()
  assert(profile, 'No active profile found')

  const { error: insertErr } = await supabase.from('skolenia').insert({
    profile_id: profile.id,
    typ: 'bozp',
    nazov: 'TEST BOZP školenie',
    datum_absolvovany: '2026-04-17',
    platnost_do: '2027-04-17',
    stav: 'platne',
  })
  assert(!insertErr, `Insert error: ${insertErr?.message}`)

  const { data: skolenia, error: readErr } = await supabase.from('skolenia')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('nazov', 'TEST BOZP školenie')
  assert(!readErr, `Read error: ${readErr?.message}`)
  assert(skolenia.length > 0, 'No skolenia returned')

  // Cleanup
  await supabase.from('skolenia').delete().eq('nazov', 'TEST BOZP školenie').eq('profile_id', profile.id)
})

// ═══ 8. TANKOVE KARTY TEST ═══
console.log('\n⛽ 8. Tankové karty — Create & Read')

await test('Can insert tankova karta (to vehicle)', async () => {
  const { data: vozidlo } = await supabase.from('vozidla').select('id').limit(1).single()
  if (!vozidlo) { console.log('    ⚠️  No vehicles to test with, skipping'); return }

  const { error: insertErr } = await supabase.from('tankove_karty').insert({
    cislo_karty: 'TEST-0001',
    typ: 'shell',
    vozidlo_id: vozidlo.id,
    stav: 'aktivna',
  })
  assert(!insertErr, `Insert error: ${insertErr?.message}`)

  // Cleanup
  await supabase.from('tankove_karty').delete().eq('cislo_karty', 'TEST-0001')
})

await test('Constraint blocks both vozidlo_id AND vodic_id', async () => {
  const { data: vozidlo } = await supabase.from('vozidla').select('id').limit(1).single()
  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single()
  if (!vozidlo || !profile) { console.log('    ⚠️  No data to test constraint, skipping'); return }

  const { error } = await supabase.from('tankove_karty').insert({
    cislo_karty: 'TEST-CONSTRAINT',
    typ: 'ina',
    vozidlo_id: vozidlo.id,
    vodic_id: profile.id,
    stav: 'aktivna',
  })
  assert(error, 'Expected constraint violation but insert succeeded!')
  // Cleanup just in case
  await supabase.from('tankove_karty').delete().eq('cislo_karty', 'TEST-CONSTRAINT')
})

// ═══ 9. TANKOVANIE TEST ═══
console.log('\n⛽ 9. Tankovanie — Create & Read')

await test('Can insert tankovanie record', async () => {
  const { data: vozidlo } = await supabase.from('vozidla').select('id').limit(1).single()
  if (!vozidlo) { console.log('    ⚠️  No vehicles, skipping'); return }

  const { data: profile } = await supabase.from('profiles').select('id').eq('active', true).limit(1).single()

  const { data, error } = await supabase.from('vozidlo_tankovanie').insert({
    vozidlo_id: vozidlo.id,
    datum: '2026-04-17',
    litrov: 45.5,
    cena_za_liter: 1.45,
    celkova_cena: 65.98,
    km_na_tachometri: 125000,
    plna_naplna: true,
    created_by: profile?.id,
  }).select().single()
  assert(!error, `Insert error: ${error?.message}`)

  // Cleanup
  if (data) await supabase.from('vozidlo_tankovanie').delete().eq('id', data.id)
})

// ═══ 10. ARCHIV VERZIOVANIE TEST ═══
console.log('\n📄 10. Archív — Versioning Fields')

await test('dokumenty_archiv accepts verzia and povodny_dokument_id', async () => {
  const { data, error } = await supabase.from('dokumenty_archiv')
    .select('id, verzia, povodny_dokument_id, platnost_do, kategoria_id')
    .limit(5)
  assert(!error, `Query error: ${error?.message}`)
  // Check default verzia
  if (data && data.length > 0) {
    const first = data[0]
    assert(first.verzia !== undefined, 'verzia field missing')
  }
})

// ═══ 11. SETTINGS ═══
console.log('\n⚙️ 11. Settings')

await test('Settings exist and have required fields', async () => {
  const { data, error } = await supabase.from('settings').select('*').single()
  assert(!error, `Settings error: ${error?.message}`)
  assert(data.company_name, 'Missing company_name')
  assert(data.stravne_doma_5do12h !== undefined, 'Missing stravne rates')
  assert(data.dph_phm !== undefined, 'Missing DPH')
})

// ═══ 12. FIRMY ═══
console.log('\n🏢 12. Firmy')

await test('8 firiem exists', async () => {
  const { data, error } = await supabase.from('firmy').select('kod, nazov').eq('aktivna', true).order('poradie')
  assert(!error, `Query error: ${error?.message}`)
  assert(data.length >= 7, `Expected >= 7 firms, got ${data.length}`)
})

// ═══ 13. PAGES LOAD TEST ═══
console.log('\n🌐 13. Pages — HTTP Status Check')

const BASE = 'http://localhost:3333'
const publicPages = [
  '/login',
  '/dochadzka',
]

for (const page of publicPages) {
  await test(`Page ${page} returns 200`, async () => {
    const res = await fetch(`${BASE}${page}`)
    assert(res.status === 200, `Got ${res.status}`)
  })
}

// Auth pages should redirect to /login (302 or 307)
const authPages = [
  '/',
  '/admin',
  '/admin/jazdy',
  '/admin/manual',
  '/admin/nastavenia',
  '/admin/archiv',
  '/admin/zamestnanci',
  '/admin/sluzobne-cesty',
  '/admin/dovolenky',
  '/admin/dochadzka',
  '/admin/reporty',
  '/fleet',
  '/fleet/vozidla',
  '/fleet/servisy',
  '/fleet/kontroly',
  '/fleet/hlasenia',
  '/fleet/reporty',
  '/fleet/tankove-karty',
  '/moja-karta',
  '/moje-jazdy',
  '/nova-jazda',
  '/dovolenka',
  '/dochadzka-prehled',
  '/sluzobna-cesta',
  '/moje-vozidlo',
  '/notifikacie',
]

for (const page of authPages) {
  await test(`Page ${page} loads (200 or redirect)`, async () => {
    const res = await fetch(`${BASE}${page}`, { redirect: 'manual' })
    // 200 = loaded, 302/307 = redirect to login (expected for unauthenticated)
    assert([200, 302, 303, 307, 308].includes(res.status), `Got ${res.status} — possible crash`)
  })
}

// ═══ SUMMARY ═══
console.log('\n══════════════════════════════════════')
console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
console.log('══════════════════════════════════════')

if (errors.length > 0) {
  console.log('\n❌ FAILED TESTS:')
  for (const e of errors) {
    console.log(`  - ${e.name}: ${e.error}`)
  }
}

console.log()
process.exit(failed > 0 ? 1 : 0)
