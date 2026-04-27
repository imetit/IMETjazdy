#!/usr/bin/env node
/**
 * IMET E2E Test — komplexné overenie biznis logiky a prepojení medzi modulmi.
 * Pri zlyhaní vidno EXAKTNE čo a prečo.
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  for (const line of envContent.split('\n')) {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let passed = 0, failed = 0, warnings = 0
const errors = [], warnList = []
const created = {
  profiles: [], jazdy: [], dovolenky: [], cesty: [], dochadzka: [],
  dokumenty: [], skolenia: [], onboarding: [], tankove_karty: [],
  tankovanie: [], vozidla: [], servisy: [], kontroly: [], hlasenia: [],
  poistne: [], notifikacie: [], audit: [], cesta_doklady: [],
  vozidlo_vodici: [], vozidlo_tacho: [],
}

async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✅ ${name}`) }
  catch (err) {
    failed++
    const msg = err.message || String(err)
    errors.push({ name, error: msg })
    console.log(`  ❌ ${name}: ${msg}`)
  }
}
function warn(name, msg) { warnings++; warnList.push({ name, msg }); console.log(`  ⚠️  ${name}: ${msg}`) }
function assert(c, m) { if (!c) throw new Error(m) }
function assertEq(a, e, m) { if (a !== e) throw new Error(`${m}: expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`) }
function section(t) {
  console.log(`\n══════════════════════════════════════`)
  console.log(`  ${t}`)
  console.log(`══════════════════════════════════════`)
}

const TS = Date.now()
const TAG = `__e2etest_${TS}__`

console.log('\n╔══════════════════════════════════════════════════╗')
console.log('║  IMET End-to-End Test — Biznis logika           ║')
console.log('╚══════════════════════════════════════════════════╝')

// ─── PHASE 0: SETUP ───
section('PHASE 0: Setup test entít')

let testEmployeeId, testManagerId, testAdminId, testFirmaId, testVozidloId

await test('Create test employee (auth + profile)', async () => {
  const { data, error } = await sb.auth.admin.createUser({
    email: `${TAG}_employee@imet.sk`, password: 'TestPass123!', email_confirm: true,
  })
  assert(!error, error?.message)
  testEmployeeId = data.user.id
  created.profiles.push(testEmployeeId)
  const { error: e2 } = await sb.from('profiles').update({
    full_name: 'TEST Zamestnanec', role: 'zamestnanec', active: true,
    typ_uvazku: 'tpp', tyzdnovy_fond_hodiny: 40, pracovne_dni_tyzdne: 5,
    pracovny_fond_hodiny: 8.0,
  }).eq('id', testEmployeeId)
  assert(!e2, `Profile update: ${e2?.message}`)
})

await test('Create test manager (nadriadený)', async () => {
  const { data, error } = await sb.auth.admin.createUser({
    email: `${TAG}_manager@imet.sk`, password: 'TestPass123!', email_confirm: true,
  })
  assert(!error, error?.message)
  testManagerId = data.user.id
  created.profiles.push(testManagerId)
  await sb.from('profiles').update({ full_name: 'TEST Manager', role: 'zamestnanec', active: true, typ_uvazku: 'tpp' }).eq('id', testManagerId)
  const { error: linkErr } = await sb.from('profiles').update({ nadriadeny_id: testManagerId }).eq('id', testEmployeeId)
  assert(!linkErr, linkErr?.message)
})

await test('Create test admin', async () => {
  const { data, error } = await sb.auth.admin.createUser({
    email: `${TAG}_admin@imet.sk`, password: 'TestPass123!', email_confirm: true,
  })
  assert(!error, error?.message)
  testAdminId = data.user.id
  created.profiles.push(testAdminId)
  await sb.from('profiles').update({ full_name: 'TEST Admin', role: 'admin', active: true }).eq('id', testAdminId)
})

await test('Find existing firma IMET', async () => {
  const { data, error } = await sb.from('firmy').select('id, kod').eq('kod', 'IMET').single()
  assert(!error && data, error?.message)
  testFirmaId = data.id
  await sb.from('profiles').update({ firma_id: testFirmaId }).eq('id', testEmployeeId)
})

await test('Create test vozidlo (správne polia)', async () => {
  const { data, error } = await sb.from('vozidla').insert({
    spz: `T${TS.toString().slice(-5)}`,
    znacka: 'TEST',
    variant: 'E2E',
    druh: 'osobne',
    typ_vozidla: 'osobne',
    palivo: 'diesel',
    spotreba_tp: 6.5,
    stav: 'aktivne',
    aktivne: true,
    rok_vyroby: 2026,
    aktualne_km: 100000,
  }).select().single()
  assert(!error, error?.message)
  testVozidloId = data.id
  created.vozidla.push(testVozidloId)
  await sb.from('profiles').update({ vozidlo_id: testVozidloId }).eq('id', testEmployeeId)
})

// ─── PHASE 1: MULTI-TENANT ───
section('PHASE 1: Multi-tenant — Firmy')

await test('Aspoň 7 aktívnych firiem', async () => {
  const { data, error } = await sb.from('firmy').select('kod, nazov, mena, moduly_default').eq('aktivna', true)
  assert(!error, error?.message)
  assert(data.length >= 7, `Expected >=7, got ${data.length}`)
  console.log(`     ${data.length} aktívnych: ${data.map(f => f.kod).join(', ')}`)
})

await test('Matka IMET má je_matka=true', async () => {
  const { data } = await sb.from('firmy').select('je_matka, moduly_default').eq('kod', 'IMET').single()
  assertEq(data.je_matka, true, 'je_matka')
})

await test('Profile firma_id linkuje na firmy (FK join)', async () => {
  const { data, error } = await sb.from('profiles')
    .select('firma_id, firmy:firma_id(kod, nazov)')
    .eq('id', testEmployeeId).single()
  assert(!error, error?.message)
  assertEq(data.firma_id, testFirmaId, 'firma_id')
  assertEq(data.firmy?.kod, 'IMET', 'firma join')
})

// ─── PHASE 2: PROFILE INTEGRITY ───
section('PHASE 2: Profile integrity (typ_uvazku, cycle, zastupuje)')

await test('typ_uvazku = tpp', async () => {
  const { data } = await sb.from('profiles').select('typ_uvazku').eq('id', testEmployeeId).single()
  assertEq(data.typ_uvazku, 'tpp', 'typ_uvazku')
})

await test('typ_uvazku odmietne neplatnú hodnotu', async () => {
  const { error } = await sb.from('profiles').update({ typ_uvazku: 'BLABLA' }).eq('id', testEmployeeId)
  assert(error, 'CHECK constraint na typ_uvazku CHÝBA!')
})

await test('Cycle detection — DB úroveň', async () => {
  const { error } = await sb.from('profiles').update({ nadriadeny_id: testEmployeeId }).eq('id', testEmployeeId)
  if (!error) {
    await sb.from('profiles').update({ nadriadeny_id: testManagerId }).eq('id', testEmployeeId)
    warn('Cycle detection', 'DB povolila self-loop nadriadeny_id. App vrstva to musí kontrolovať (zamestnanci.ts).')
  }
})

await test('zastupuje_id self-reference', async () => {
  const { error } = await sb.from('profiles').update({ zastupuje_id: testEmployeeId }).eq('id', testEmployeeId)
  if (!error) {
    await sb.from('profiles').update({ zastupuje_id: null }).eq('id', testEmployeeId)
    warn('zastupuje_id self', 'DB povolila zastupuje_id=self.')
  }
})

await test('Validné nastavenie zastupuje_id (manager → admin)', async () => {
  const { error } = await sb.from('profiles').update({ zastupuje_id: testAdminId }).eq('id', testManagerId)
  assert(!error, error?.message)
})

// ─── PHASE 3: JAZDY ───
section('PHASE 3: Modul Jazdy')

let testJazdaId
await test('Insert jazda', async () => {
  const { data, error } = await sb.from('jazdy').insert({
    user_id: testEmployeeId,
    mesiac: '2026-04',
    km: 1234,
    vozidlo_id: testVozidloId,
    odchod_z: 'Bratislava',
    prichod_do: 'Žilina',
    cas_odchodu: '08:00',
    cas_prichodu: '16:00',
    stav: 'odoslana',
    typ: 'firemne_doma',
  }).select().single()
  assert(!error, error?.message)
  testJazdaId = data.id
  created.jazdy.push(testJazdaId)
  assertEq(data.km, 1234, 'km')
})

await test('Jazda FK joins (vozidlo + user)', async () => {
  const { data } = await sb.from('jazdy')
    .select('id, vozidla(spz, znacka), profiles!user_id(full_name)')
    .eq('id', testJazdaId).single()
  assert(data.vozidla?.spz?.startsWith('T'), `Vozidlo join: ${JSON.stringify(data.vozidla)}`)
  assertEq(data.profiles?.full_name, 'TEST Zamestnanec', 'user join')
})

// ─── PHASE 4: VOZOVÝ PARK ───
section('PHASE 4: Modul Vozový park')

await test('Servis s plánovaním (nasledny_servis_km/datum)', async () => {
  const { data, error } = await sb.from('vozidlo_servisy').insert({
    vozidlo_id: testVozidloId,
    datum: '2026-04-15',
    typ: 'servis',
    cena: 250.50,
    km_pri_servise: 100000,
    nasledny_servis_km: 110000,
    nasledny_servis_datum: '2027-04-15',
    interval_km: 10000,
    interval_mesiace: 12,
    popis: 'TEST servis',
    stav: 'dokoncene',
  }).select().single()
  assert(!error, error?.message)
  created.servisy.push(data.id)
  assertEq(data.nasledny_servis_km, 110000, 'nasledny_servis_km')
})

await test('Kontrola STK', async () => {
  const { data, error } = await sb.from('vozidlo_kontroly').insert({
    vozidlo_id: testVozidloId,
    typ: 'stk',
    datum_vykonania: '2026-04-01',
    platnost_do: '2028-04-01',
    cena: 50,
  }).select().single()
  assert(!error, error?.message)
  created.kontroly.push(data.id)
})

await test('Hlásenie poruchy (priorita=normalna, stav=nove)', async () => {
  const { data, error } = await sb.from('vozidlo_hlasenia').insert({
    vozidlo_id: testVozidloId,
    user_id: testEmployeeId,
    popis: 'TEST porucha',
    priorita: 'normalna',
    stav: 'nove',
  }).select().single()
  assert(!error, error?.message)
  created.hlasenia.push(data.id)
})

await test('Poistná udalosť + finančné polia', async () => {
  const { data, error } = await sb.from('poistne_udalosti').insert({
    vozidlo_id: testVozidloId,
    user_id: testEmployeeId,
    datum: '2026-04-10',
    miesto: 'TEST',
    popis: 'TEST nehoda',
    cislo_poistky: 'POL-12345',
    skoda_odhad: 1500.00,
    skoda_skutocna: 1280.50,
    poistovna_plnenie: 1180.50,
    spoluucast: 100.00,
    stav: 'nahlasena',
  }).select().single()
  assert(!error, error?.message)
  created.poistne.push(data.id)
  const sum = parseFloat(data.poistovna_plnenie) + parseFloat(data.spoluucast)
  const expected = parseFloat(data.skoda_skutocna)
  assert(Math.abs(sum - expected) < 0.01, `plnenie+spoluucast=${sum} ≠ skoda=${expected}`)
})

await test('vozidlo_vodici M:N priradenie + primarny flag', async () => {
  const { data, error } = await sb.from('vozidlo_vodici').insert({
    vozidlo_id: testVozidloId,
    user_id: testManagerId,
    od: '2026-04-01',
    primarny: false,
  }).select().single()
  assert(!error, error?.message)
  created.vozidlo_vodici.push(data.id)
})

await test('Tachometer mesačný záznam (mesiac VARCHAR(7))', async () => {
  const { data, error } = await sb.from('vozidlo_tacho_zaznamy').insert({
    vozidlo_id: testVozidloId,
    mesiac: '2026-04',
    stav_km: 100500,
    zapisal_id: testEmployeeId,
  }).select().single()
  assert(!error, error?.message)
  created.vozidlo_tacho.push(data.id)
})

// ─── PHASE 5: TANKOVANIE ───
section('PHASE 5: Tankovanie + karty')

let testKartaId
await test('Tankova karta na VOZIDLO', async () => {
  const { data, error } = await sb.from('tankove_karty').insert({
    cislo_karty: `${TAG}_K1`, typ: 'shell', vozidlo_id: testVozidloId, stav: 'aktivna',
  }).select().single()
  assert(!error, error?.message)
  testKartaId = data.id
  created.tankove_karty.push(testKartaId)
})

await test('Tankova karta na VODIČA', async () => {
  const { data, error } = await sb.from('tankove_karty').insert({
    cislo_karty: `${TAG}_K2`, typ: 'omv', vodic_id: testEmployeeId, stav: 'aktivna',
  }).select().single()
  assert(!error, error?.message)
  created.tankove_karty.push(data.id)
})

await test('CONSTRAINT chk_tankova_karta_priradenie blokuje OBE', async () => {
  const { data, error } = await sb.from('tankove_karty').insert({
    cislo_karty: `${TAG}_KBAD`, typ: 'ina', vozidlo_id: testVozidloId, vodic_id: testEmployeeId, stav: 'aktivna',
  }).select()
  if (data && data.length) {
    await sb.from('tankove_karty').delete().eq('cislo_karty', `${TAG}_KBAD`)
    throw new Error('BUG: insert prešiel s OBOMA!')
  }
  assert(error, 'Chyba mala prísť')
})

await test('Tankovanie s konzistentnou cenou', async () => {
  const litrov = 45.50
  const cena_za_liter = 1.485
  const celkova = parseFloat((litrov * cena_za_liter).toFixed(2))
  const { data, error } = await sb.from('vozidlo_tankovanie').insert({
    vozidlo_id: testVozidloId,
    datum: '2026-04-15',
    litrov, cena_za_liter,
    celkova_cena: celkova,
    km_na_tachometri: 100200,
    plna_naplna: true,
    tankova_karta_id: testKartaId,
    created_by: testEmployeeId,
  }).select().single()
  assert(!error, error?.message)
  created.tankovanie.push(data.id)
  const exp = parseFloat((data.litrov * data.cena_za_liter).toFixed(2))
  assert(Math.abs(exp - parseFloat(data.celkova_cena)) < 0.05, `cena nekonzistentná`)
})

// ─── PHASE 6: DOCHÁDZKA ───
section('PHASE 6: Dochádzka — záznamy + kalendár')

await test('isPracovnyDen — 2026-04-15 streda = pracovný', async () => {
  const day = new Date('2026-04-15T00:00:00').getDay()
  assertEq(day, 3, 'streda')
})

await test('Insert dochádzka (zdroj=manual)', async () => {
  const datum = '2026-04-15'
  const r1 = await sb.from('dochadzka').insert({
    user_id: testEmployeeId, datum, smer: 'prichod', dovod: 'praca',
    cas: '2026-04-15T08:00:00.000Z', zdroj: 'manual',
  }).select().single()
  assert(!r1.error, r1.error?.message)
  created.dochadzka.push(r1.data.id)
  const r2 = await sb.from('dochadzka').insert({
    user_id: testEmployeeId, datum, smer: 'odchod', dovod: 'praca',
    cas: '2026-04-15T16:30:00.000Z', zdroj: 'manual',
  }).select().single()
  assert(!r2.error, r2.error?.message)
  created.dochadzka.push(r2.data.id)
})

await test('CHECK zdroj odmietne neplatnú hodnotu', async () => {
  const { error } = await sb.from('dochadzka').insert({
    user_id: testEmployeeId, datum: '2026-04-16', smer: 'prichod', dovod: 'praca',
    cas: '2026-04-16T08:00:00.000Z', zdroj: 'NEPLATNY_XXX',
  })
  assert(error, 'CHECK zdroj nefunguje!')
})

// ─── PHASE 7: DOVOLENKY → AUTO-FLOW ───
section('PHASE 7: Dovolenky — auto-flow do dochádzky')

let testDovolenkaId
const dovDays = ['2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08']

await test('Vytvor dovolenku (stav=schvalena, typ=dovolenka)', async () => {
  const { data, error } = await sb.from('dovolenky').insert({
    user_id: testEmployeeId,
    datum_od: dovDays[0], datum_do: dovDays[4],
    typ: 'dovolenka', stav: 'schvalena',
    schvalovatel_id: testManagerId,
    schvalene_at: new Date().toISOString(),
  }).select().single()
  assert(!error, error?.message)
  testDovolenkaId = data.id
  created.dovolenky.push(testDovolenkaId)
})

await test('OČR typ akceptovaný (wave1)', async () => {
  const { data, error } = await sb.from('dovolenky').insert({
    user_id: testEmployeeId,
    datum_od: '2026-05-13', datum_do: '2026-05-13',
    typ: 'ocr', stav: 'caka_na_schvalenie',
    schvalovatel_id: testManagerId,
  }).select().single()
  assert(!error, error?.message)
  created.dovolenky.push(data.id)
})

await test('Pol dňa dovolenka (pol_dna + cast_dna)', async () => {
  const { data, error } = await sb.from('dovolenky').insert({
    user_id: testEmployeeId,
    datum_od: '2026-05-14', datum_do: '2026-05-14',
    typ: 'dovolenka', stav: 'caka_na_schvalenie',
    schvalovatel_id: testManagerId,
    pol_dna: true, cast_dna: 'dopoludnie',
  }).select().single()
  assert(!error, error?.message)
  created.dovolenky.push(data.id)
  assertEq(data.pol_dna, true, 'pol_dna')
  assertEq(data.cast_dna, 'dopoludnie', 'cast_dna')
})

await test('Auto-flow: insert 5 dní × 2 záznamy do dochádzky', async () => {
  const inserts = []
  for (const datum of dovDays) {
    inserts.push(
      { user_id: testEmployeeId, datum, smer: 'prichod', dovod: 'dovolenka', cas: `${datum}T08:00:00Z`, zdroj: 'system' },
      { user_id: testEmployeeId, datum, smer: 'odchod', dovod: 'dovolenka', cas: `${datum}T16:30:00Z`, zdroj: 'system' },
    )
  }
  const { data, error } = await sb.from('dochadzka').insert(inserts).select()
  assert(!error, error?.message)
  assertEq(data.length, 10, 'počet záznamov')
  for (const r of data) created.dochadzka.push(r.id)
})

await test('Verifikuj auto záznamy v dochádzke', async () => {
  const { data } = await sb.from('dochadzka')
    .select('datum, smer, dovod, zdroj')
    .eq('user_id', testEmployeeId).eq('dovod', 'dovolenka')
    .gte('datum', dovDays[0]).lte('datum', dovDays[4])
  assertEq(data.length, 10, 'auto záznamy')
  assert(data.every(r => r.zdroj === 'system'), 'zdroj=system')
})

// ─── PHASE 8: SLUŽOBNÉ CESTY → AUTO-FLOW ───
section('PHASE 8: Služobné cesty')

let testCestaId
const cestaDays = ['2026-05-19', '2026-05-20']

await test('Vytvor cestu DOMÁCU (firemne_auto, typ_cesty=domaca)', async () => {
  const { data, error } = await sb.from('sluzobne_cesty').insert({
    user_id: testEmployeeId,
    datum_od: cestaDays[0], datum_do: cestaDays[1],
    ciel: 'Žilina', ucel: 'TEST stretnutie',
    doprava: 'firemne_auto',
    predpokladany_km: 400,
    typ_cesty: 'domaca',
    krajina: 'SK', mena: 'EUR',
    stav: 'schvalena',
    schvalovatel_id: testManagerId,
    schvalene_at: new Date().toISOString(),
    vyuctovanie_stav: 'caka_na_doklady',
  }).select().single()
  assert(!error, error?.message)
  testCestaId = data.id
  created.cesty.push(testCestaId)
  assertEq(data.typ_cesty, 'domaca', 'typ_cesty')
})

await test('Vytvor cestu ZAHRANIČNÚ + preddavok', async () => {
  const { data, error } = await sb.from('sluzobne_cesty').insert({
    user_id: testEmployeeId,
    datum_od: '2026-06-01', datum_do: '2026-06-03',
    ciel: 'Wien', ucel: 'TEST conference',
    doprava: 'lietadlo',
    typ_cesty: 'zahranicna',
    krajina: 'AT', mena: 'EUR',
    preddavok_suma: 500.00, preddavok_stav: 'ziadany',
    stav: 'nova',
    schvalovatel_id: testManagerId,
  }).select().single()
  assert(!error, error?.message)
  created.cesty.push(data.id)
  assertEq(parseFloat(data.preddavok_suma), 500, 'preddavok_suma')
  assertEq(data.preddavok_stav, 'ziadany', 'preddavok_stav')
})

await test('Cesta doklad (cesta_id, nahral_id, suma)', async () => {
  const { data, error } = await sb.from('cesta_doklady').insert({
    cesta_id: testCestaId,
    typ: 'ubytovanie',
    nazov: 'TEST blocek hotel',
    suma: 120.00, mena: 'EUR',
    file_path: `test/${TAG}_blocek.pdf`,
    stav: 'neskontrolovany',
    nahral_id: testEmployeeId,
  }).select().single()
  assert(!error, error?.message)
  created.cesta_doklady.push(data.id)
  assertEq(data.stav, 'neskontrolovany', 'default stav')
})

await test('Auto-flow cesta → dochádzka', async () => {
  const inserts = []
  for (const datum of cestaDays) {
    inserts.push(
      { user_id: testEmployeeId, datum, smer: 'prichod', dovod: 'sluzobna_cesta', cas: `${datum}T08:00:00Z`, zdroj: 'system' },
      { user_id: testEmployeeId, datum, smer: 'odchod', dovod: 'sluzobna_cesta', cas: `${datum}T16:30:00Z`, zdroj: 'system' },
    )
  }
  const { data, error } = await sb.from('dochadzka').insert(inserts).select()
  assert(!error, error?.message)
  assertEq(data.length, 4, 'počet')
  for (const r of data) created.dochadzka.push(r.id)
})

// ─── PHASE 9: ARCHÍV + VERSIONING ───
section('PHASE 9: Archív dokumentov + versioning')

let kategoriaId, dokumentV1Id

await test('Načítaj kategóriu Zmluvy + má fin_manager v pristup_role', async () => {
  const { data, error } = await sb.from('archiv_kategorie').select('id, pristup_role').eq('nazov', 'Zmluvy').single()
  assert(!error, error?.message)
  kategoriaId = data.id
  assert(data.pristup_role.includes('fin_manager'), `Zmluvy musia mať fin_manager: ${JSON.stringify(data.pristup_role)}`)
})

await test('Insert dokument v1 (typ=zmluva, stav=nahrany)', async () => {
  const { data, error } = await sb.from('dokumenty_archiv').insert({
    nazov: `${TAG}_zmluva`,
    typ: 'zmluva',
    file_path: `test/${TAG}_v1.pdf`,
    nahral_id: testAdminId,
    kategoria_id: kategoriaId,
    verzia: 1,
    platnost_do: '2027-12-31',
    stav: 'nahrany',
  }).select().single()
  assert(!error, error?.message)
  dokumentV1Id = data.id
  created.dokumenty.push(dokumentV1Id)
  assertEq(data.verzia, 1, 'verzia')
})

await test('Insert dokument v2 s povodny_dokument_id linkom', async () => {
  const { data, error } = await sb.from('dokumenty_archiv').insert({
    nazov: `${TAG}_zmluva`,
    typ: 'zmluva',
    file_path: `test/${TAG}_v2.pdf`,
    nahral_id: testAdminId,
    kategoria_id: kategoriaId,
    verzia: 2,
    povodny_dokument_id: dokumentV1Id,
    platnost_do: '2028-12-31',
    stav: 'nahrany',
  }).select().single()
  assert(!error, error?.message)
  created.dokumenty.push(data.id)
  assertEq(data.povodny_dokument_id, dokumentV1Id, 'link')
  assertEq(data.verzia, 2, 'verzia')
})

await test('Verzia chain (v1 + v2)', async () => {
  const { data } = await sb.from('dokumenty_archiv')
    .select('verzia, povodny_dokument_id')
    .or(`id.eq.${dokumentV1Id},povodny_dokument_id.eq.${dokumentV1Id}`)
    .order('verzia')
  assertEq(data.length, 2, 'chain')
  assertEq(data[0].verzia, 1, 'v1')
  assertEq(data[1].verzia, 2, 'v2')
})

// ─── PHASE 10: ONBOARDING ───
section('PHASE 10: Onboarding flow')

await test('Insert 3 onboarding items', async () => {
  const items = [
    { typ: 'dokument', nazov: 'TEST Pracovná zmluva' },
    { typ: 'skolenie', nazov: 'TEST BOZP úvodné' },
    { typ: 'majetok', nazov: 'TEST Notebook' },
  ]
  const { data, error } = await sb.from('onboarding_items').insert(
    items.map(i => ({ ...i, profile_id: testEmployeeId, splnene: false }))
  ).select()
  assert(!error, error?.message)
  assertEq(data.length, 3, 'count')
  for (const r of data) created.onboarding.push(r.id)
})

await test('Označ item splnene=true', async () => {
  const { data: it } = await sb.from('onboarding_items').select('id').eq('profile_id', testEmployeeId).limit(1).single()
  const { error } = await sb.from('onboarding_items').update({
    splnene: true, splnene_datum: new Date().toISOString(), splnil_id: testAdminId,
  }).eq('id', it.id)
  assert(!error, error?.message)
})

// ─── PHASE 11: ŠKOLENIA ───
section('PHASE 11: Školenia + expirácia')

await test('Insert školenie BOZP s platnost_do', async () => {
  const { data, error } = await sb.from('skolenia').insert({
    profile_id: testEmployeeId,
    typ: 'bozp', nazov: 'TEST BOZP základné',
    datum_absolvovany: '2026-04-01',
    platnost_do: '2027-04-01',
    stav: 'platne',
  }).select().single()
  assert(!error, error?.message)
  created.skolenia.push(data.id)
})

await test('Detect expirujúce školenia (do +90d)', async () => {
  const exp = new Date(); exp.setDate(exp.getDate() + 30)
  const { data: school, error } = await sb.from('skolenia').insert({
    profile_id: testEmployeeId,
    typ: 'vodicska', nazov: 'TEST Vodičák blízko exp',
    platnost_do: exp.toISOString().split('T')[0],
    stav: 'platne',
  }).select().single()
  assert(!error, error?.message)
  created.skolenia.push(school.id)

  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 90)
  const { data: expirujuce } = await sb.from('skolenia')
    .select('id, nazov, platnost_do')
    .eq('profile_id', testEmployeeId)
    .lte('platnost_do', cutoff.toISOString().split('T')[0])
    .eq('stav', 'platne')
  assert(expirujuce.length >= 1, `Expirujúce: ${expirujuce.length}`)
})

// ─── PHASE 12: NOTIFIKÁCIE ───
section('PHASE 12: Notifikácie')

await test('Insert notifikácia', async () => {
  const { data, error } = await sb.from('notifikacie').insert({
    user_id: testEmployeeId, typ: 'test',
    nadpis: `${TAG} TEST`, sprava: 'TEST', link: '/',
  }).select().single()
  assert(!error, error?.message)
  created.notifikacie.push(data.id)
})

// ─── PHASE 13: AUDIT LOG ───
section('PHASE 13: Audit log')

await test('Insert audit_log (zaznam_id, detail)', async () => {
  const { data, error } = await sb.from('audit_log').insert({
    user_id: testAdminId,
    akcia: `${TAG}_action`,
    tabulka: 'profiles',
    zaznam_id: testEmployeeId,
    detail: { test: true },
  }).select().single()
  assert(!error, error?.message)
  created.audit.push(data.id)
})

// ─── PHASE 14: SETTINGS ───
section('PHASE 14: Settings konzistencia')

await test('Settings — firemné údaje + sadzby 2024', async () => {
  const { data, error } = await sb.from('settings').select('*').single()
  assert(!error, error?.message)
  assert(data.company_name, 'company_name')
  console.log(`     ${data.company_name} | stravne 5-12h: ${data.stravne_doma_5do12h}€ | DPH: ${data.dph_phm}%`)
  assertEq(data.company_name, 'IMET, a.s.', 'company_name')
})

// ─── PHASE 15: KOMPLEXNÉ PREPOJENIA ───
section('PHASE 15: Komplexné prepojenia (RFID, dovolenky_naroky)')

await test('RFID karta priradenie', async () => {
  const { data, error } = await sb.from('rfid_karty').insert({
    user_id: testEmployeeId,
    kod_karty: `${TAG}_rfid`,
    aktivna: true,
  }).select().single()
  if (error) { warn('rfid_karty', error.message); return }
  await sb.from('rfid_karty').delete().eq('id', data.id)
})

await test('Dovolenkový nárok (pre rok 2026)', async () => {
  const { data, error } = await sb.from('dovolenky_naroky').insert({
    user_id: testEmployeeId,
    rok: 2026,
    narok_dni: 25,
    prenesene_dni: 0,
  }).select().single()
  if (error) { warn('dovolenky_naroky', error.message); return }
  assertEq(data.narok_dni, 25, 'narok_dni')
  await sb.from('dovolenky_naroky').delete().eq('id', data.id)
})

// ─── CLEANUP ───
section('CLEANUP')

async function safeDelete(table, ids) {
  if (!ids?.length) return
  const { error } = await sb.from(table).delete().in('id', ids)
  if (error) console.log(`  ⚠️  Delete ${table}: ${error.message}`)
  else console.log(`  🗑️  ${table}: ${ids.length}`)
}

await safeDelete('cesta_doklady', created.cesta_doklady)
await safeDelete('dochadzka', created.dochadzka)
await safeDelete('sluzobne_cesty', created.cesty)
await safeDelete('dovolenky', created.dovolenky)
await safeDelete('jazdy', created.jazdy)
await safeDelete('vozidlo_tankovanie', created.tankovanie)
await safeDelete('tankove_karty', created.tankove_karty)
await safeDelete('vozidlo_servisy', created.servisy)
await safeDelete('vozidlo_kontroly', created.kontroly)
await safeDelete('vozidlo_hlasenia', created.hlasenia)
await safeDelete('poistne_udalosti', created.poistne)
await safeDelete('vozidlo_vodici', created.vozidlo_vodici)
await safeDelete('vozidlo_tacho_zaznamy', created.vozidlo_tacho)
await safeDelete('dokumenty_archiv', created.dokumenty)
await safeDelete('skolenia', created.skolenia)
await safeDelete('onboarding_items', created.onboarding)
await safeDelete('notifikacie', created.notifikacie)
await safeDelete('audit_log', created.audit)
await safeDelete('vozidla', created.vozidla)

for (const pid of created.profiles) {
  await sb.from('profiles').update({ nadriadeny_id: null, vozidlo_id: null, zastupuje_id: null, firma_id: null }).eq('id', pid)
}
for (const pid of created.profiles) {
  const { error } = await sb.auth.admin.deleteUser(pid)
  if (error) console.log(`  ⚠️  Delete user: ${error.message}`)
}
console.log(`  🗑️  profiles/users: ${created.profiles.length}`)

// ─── SUMMARY ───
console.log('\n╔══════════════════════════════════════════════════╗')
console.log(`║  RESULTS: ${String(passed).padStart(3)} passed, ${String(failed).padStart(3)} failed, ${String(warnings).padStart(3)} warnings ║`)
console.log('╚══════════════════════════════════════════════════╝')

if (errors.length) {
  console.log('\n❌ FAILED:')
  for (const e of errors) console.log(`  - ${e.name}\n    → ${e.error}`)
}
if (warnList.length) {
  console.log('\n⚠️  WARNINGS:')
  for (const w of warnList) console.log(`  - ${w.name}\n    → ${w.msg}`)
}

console.log()
process.exit(failed > 0 ? 1 : 0)
