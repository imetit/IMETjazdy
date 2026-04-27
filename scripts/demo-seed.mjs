#!/usr/bin/env node
/**
 * IMET DEMO SEED — vytvorí kompletný demo dataset:
 *   - Firma DEMO (poradie 99, jasne označená)
 *   - 8 účtov s reálnou hierarchiou + zastupovaním
 *   - 4 vozidlá, jazdy, dovolenky, cesty, dochádzka, archív, školenia, atď.
 *
 * Všetko označené prefixom [DEMO] alebo emailom demo.*@imet.sk.
 * Idempotentný — najprv volá cleanup, potom seed.
 *
 * Spustenie: node scripts/demo-seed.mjs
 */

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

const PASSWORD = 'Demo123!'
const log = (msg) => console.log(msg)
const ok = (msg) => console.log(`  ✅ ${msg}`)
const fail = (msg, err) => { console.log(`  ❌ ${msg}: ${err?.message || err}`); throw new Error(msg) }

// ─── CLEANUP najprv ───
log('\n═══════════════════════════════════════')
log('  IMET DEMO SEED')
log('═══════════════════════════════════════\n')

log('🧹 Cleanup existujúcich demo dát...')

// Načítaj demo userov ak existujú
const { data: existingDemoProfiles } = await sb.from('profiles')
  .select('id').like('email', 'demo.%@imet.sk')
const existingDemoIds = (existingDemoProfiles || []).map(p => p.id)

if (existingDemoIds.length > 0) {
  // Načítaj demo vozidlá (SPZ začína "DEMO")
  const { data: demoVozidla } = await sb.from('vozidla').select('id').like('spz', 'DEMO%')
  const demoVozidlaIds = (demoVozidla || []).map(v => v.id)

  // Cesta_doklady cez sluzobne_cesty
  const { data: demoCesty } = await sb.from('sluzobne_cesty').select('id').in('user_id', existingDemoIds)
  if (demoCesty?.length) {
    await sb.from('cesta_doklady').delete().in('cesta_id', demoCesty.map(c => c.id))
  }

  await sb.from('dochadzka').delete().in('user_id', existingDemoIds)
  await sb.from('sluzobne_cesty').delete().in('user_id', existingDemoIds)
  await sb.from('dovolenky').delete().in('user_id', existingDemoIds)
  await sb.from('dovolenky_naroky').delete().in('user_id', existingDemoIds)
  await sb.from('jazdy').delete().in('user_id', existingDemoIds)
  await sb.from('notifikacie').delete().in('user_id', existingDemoIds)
  await sb.from('audit_log').delete().in('user_id', existingDemoIds)
  await sb.from('rfid_karty').delete().in('user_id', existingDemoIds)
  await sb.from('skolenia').delete().in('profile_id', existingDemoIds)
  await sb.from('onboarding_items').delete().in('profile_id', existingDemoIds)
  await sb.from('user_moduly').delete().in('user_id', existingDemoIds)

  if (demoVozidlaIds.length) {
    await sb.from('vozidlo_tankovanie').delete().in('vozidlo_id', demoVozidlaIds)
    await sb.from('tankove_karty').delete().in('vozidlo_id', demoVozidlaIds)
    await sb.from('vozidlo_servisy').delete().in('vozidlo_id', demoVozidlaIds)
    await sb.from('vozidlo_kontroly').delete().in('vozidlo_id', demoVozidlaIds)
    await sb.from('vozidlo_hlasenia').delete().in('vozidlo_id', demoVozidlaIds)
    await sb.from('poistne_udalosti').delete().in('vozidlo_id', demoVozidlaIds)
    await sb.from('vozidlo_vodici').delete().in('vozidlo_id', demoVozidlaIds)
    await sb.from('vozidlo_tacho_zaznamy').delete().in('vozidlo_id', demoVozidlaIds)
  }

  // Tankove karty viazané na demo vodičov
  await sb.from('tankove_karty').delete().in('vodic_id', existingDemoIds)

  // Demo dokumenty v archíve
  await sb.from('dokumenty_archiv').delete().like('nazov', '[DEMO]%')

  // Najprv unset FK aby šli zmazať
  await sb.from('profiles').update({
    nadriadeny_id: null, vozidlo_id: null, zastupuje_id: null, firma_id: null,
  }).in('id', existingDemoIds)

  if (demoVozidlaIds.length) {
    await sb.from('vozidla').delete().in('id', demoVozidlaIds)
  }

  // Zmaž auth users
  for (const id of existingDemoIds) {
    await sb.auth.admin.deleteUser(id)
  }

  ok(`Zmazaných ${existingDemoIds.length} demo profilov + ${demoVozidlaIds.length} vozidiel + súvisiace dáta`)
} else {
  ok('Žiadne demo dáta nenájdené (čistý štart)')
}

// Demo firma
await sb.from('firmy').delete().eq('kod', 'DEMO')
ok('Stará DEMO firma (ak bola) zmazaná')

// ─── 1. DEMO FIRMA ───
log('\n🏢 Vytváram DEMO firmu...')
const { data: demoFirma, error: firmaErr } = await sb.from('firmy').insert({
  kod: 'DEMO',
  nazov: '[DEMO] Testovacia firma',
  ico: '00000000',
  mesto: 'Bratislava',
  krajina: 'SK',
  mena: 'EUR',
  je_matka: false,
  moduly_default: ['jazdy', 'vozidla', 'dochadzka', 'dovolenky', 'sluzobne_cesty', 'archiv'],
  aktivna: true,
  poradie: 99,
}).select().single()
if (firmaErr) fail('Firma DEMO insert', firmaErr)
ok(`Firma DEMO vytvorená (id: ${demoFirma.id})`)

// ─── 2. ÚČTY ───
log('\n👥 Vytváram demo účty...')

const accounts = [
  { email: 'demo.gr@imet.sk',       full_name: '[DEMO] Peter Generálny',   role: 'it_admin',      pin: '8001', pozicia: 'Generálny riaditeľ', typ_uvazku: 'tpp' },
  { email: 'demo.fin@imet.sk',      full_name: '[DEMO] Lucia Finančná',    role: 'fin_manager',   pin: '8002', pozicia: 'Finančná riaditeľka', typ_uvazku: 'tpp' },
  { email: 'demo.uctovnik@imet.sk', full_name: '[DEMO] Eva Účtovná',       role: 'admin',         pin: '8003', pozicia: 'Účtovníčka', typ_uvazku: 'tpp' },
  { email: 'demo.fleet@imet.sk',    full_name: '[DEMO] Jozef Vozový',      role: 'fleet_manager', pin: '8004', pozicia: 'Vedúci vozového parku', typ_uvazku: 'tpp' },
  { email: 'demo.managerA@imet.sk', full_name: '[DEMO] Marek Vedúci A',    role: 'zamestnanec',   pin: '8005', pozicia: 'Vedúci tímu A', typ_uvazku: 'tpp' },
  { email: 'demo.managerB@imet.sk', full_name: '[DEMO] Anna Vedúca B',     role: 'zamestnanec',   pin: '8006', pozicia: 'Vedúca tímu B', typ_uvazku: 'tpp' },
  { email: 'demo.zam1@imet.sk',     full_name: '[DEMO] Ján Zamestnanec 1', role: 'zamestnanec',   pin: '8007', pozicia: 'Technik', typ_uvazku: 'tpp' },
  { email: 'demo.zam2@imet.sk',     full_name: '[DEMO] Mária Zamestnanec 2', role: 'zamestnanec', pin: '8008', pozicia: 'Asistentka', typ_uvazku: 'dohoda' },
  { email: 'demo.zam3@imet.sk',     full_name: '[DEMO] Tomáš Zamestnanec 3', role: 'zamestnanec', pin: '8009', pozicia: 'Operátor', typ_uvazku: 'tpp' },
  { email: 'demo.zam4@imet.sk',     full_name: '[DEMO] Katarína Zamestnanec 4', role: 'zamestnanec', pin: '8010', pozicia: 'Predajca', typ_uvazku: 'brigada' },
]

const ids = {}
for (const acc of accounts) {
  const { data: u, error } = await sb.auth.admin.createUser({
    email: acc.email, password: PASSWORD, email_confirm: true,
  })
  if (error) fail(`Auth create ${acc.email}`, error)
  const uid = u.user.id
  ids[acc.email] = uid

  const { error: pe } = await sb.from('profiles').update({
    full_name: acc.full_name,
    role: acc.role,
    active: true,
    typ_uvazku: acc.typ_uvazku,
    pin: acc.pin,
    pozicia: acc.pozicia,
    pracovny_fond_hodiny: 8.0,
    tyzdnovy_fond_hodiny: 40,
    pracovne_dni_tyzdne: 5,
    firma_id: demoFirma.id,
    datum_nastupu: '2025-01-01',
  }).eq('id', uid)
  if (pe) fail(`Profile update ${acc.email}`, pe)
  ok(`${acc.role.padEnd(14)} ${acc.full_name}`)
}

// ─── 3. HIERARCHIA ───
log('\n🌳 Nastavujem hierarchiu nadriadených...')

const hierarchy = [
  { who: 'demo.fin@imet.sk',      manager: 'demo.gr@imet.sk' },
  { who: 'demo.uctovnik@imet.sk', manager: 'demo.gr@imet.sk' },
  { who: 'demo.fleet@imet.sk',    manager: 'demo.gr@imet.sk' },
  { who: 'demo.managerA@imet.sk', manager: 'demo.gr@imet.sk' },
  { who: 'demo.managerB@imet.sk', manager: 'demo.gr@imet.sk' },
  { who: 'demo.zam1@imet.sk',     manager: 'demo.managerA@imet.sk' },
  { who: 'demo.zam2@imet.sk',     manager: 'demo.managerA@imet.sk' },
  { who: 'demo.zam3@imet.sk',     manager: 'demo.managerB@imet.sk' },
  { who: 'demo.zam4@imet.sk',     manager: 'demo.managerB@imet.sk' },
]
for (const h of hierarchy) {
  await sb.from('profiles').update({ nadriadeny_id: ids[h.manager] }).eq('id', ids[h.who])
}
ok(`${hierarchy.length} nadriadený-vzťahov nastavených`)

// Zastupovanie: Manager A je na dovolenke → zastupuje Manager B
await sb.from('profiles').update({ zastupuje_id: ids['demo.managerB@imet.sk'] }).eq('id', ids['demo.managerA@imet.sk'])
ok('Zastupovanie: Manager A → zastúpený Manager B')

// USER_MODULY pre managerov (zamestnanec rola, ale potrebujú schvaľovať)
const managerModuly = ['dovolenky', 'dochadzka', 'sluzobne_cesty']
for (const mEmail of ['demo.managerA@imet.sk', 'demo.managerB@imet.sk']) {
  await sb.from('user_moduly').insert(
    managerModuly.map(m => ({ user_id: ids[mEmail], modul: m, pristup: 'edit' }))
  )
}
ok('User moduly pre managerov A+B (dovolenky/dochadzka/sluzobne_cesty: edit)')

// ─── 4. VOZIDLÁ ───
log('\n🚗 Vytváram demo vozidlá...')

const vehicles = [
  { spz: 'DEMO001', znacka: 'Škoda', variant: 'Octavia', driver: 'demo.zam1@imet.sk' },
  { spz: 'DEMO002', znacka: 'Volkswagen', variant: 'Golf', driver: 'demo.zam2@imet.sk' },
  { spz: 'DEMO003', znacka: 'Ford', variant: 'Focus', driver: 'demo.managerA@imet.sk' },
  { spz: 'DEMO004', znacka: 'Toyota', variant: 'Corolla', driver: 'demo.fleet@imet.sk' },
]
const vehicleIds = {}
for (const v of vehicles) {
  const { data, error } = await sb.from('vozidla').insert({
    spz: v.spz, znacka: v.znacka, variant: v.variant,
    druh: 'osobne', typ_vozidla: 'osobne', palivo: 'diesel',
    spotreba_tp: 5.5, stav: 'aktivne', aktivne: true,
    rok_vyroby: 2023, aktualne_km: 50000,
  }).select().single()
  if (error) fail(`Vozidlo ${v.spz}`, error)
  vehicleIds[v.spz] = data.id
  await sb.from('profiles').update({ vozidlo_id: data.id }).eq('id', ids[v.driver])
  ok(`${v.spz} ${v.znacka} ${v.variant} → ${v.driver}`)
}

// ─── 5. ZÁZNAMY V MODULOCH ───
log('\n📋 Vytváram dáta v moduloch...')

// JAZDY (rôzne stavy)
const today = new Date().toISOString().split('T')[0]
const mesiac = today.slice(0, 7)
const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7) })()

const jazdy = [
  { user: 'demo.zam1@imet.sk', vozidlo: 'DEMO001', mesiac: lastMonth, km: 850, stav: 'spracovana', cislo_dokladu: '2026-D001', odchod_z: 'Bratislava', prichod_do: 'Žilina', naklady_celkom: 245.50 },
  { user: 'demo.zam1@imet.sk', vozidlo: 'DEMO001', mesiac, km: 320, stav: 'odoslana', odchod_z: 'Bratislava', prichod_do: 'Trnava' },
  { user: 'demo.zam2@imet.sk', vozidlo: 'DEMO002', mesiac, km: 410, stav: 'odoslana', odchod_z: 'Bratislava', prichod_do: 'Banská Bystrica' },
  { user: 'demo.zam3@imet.sk', vozidlo: 'DEMO001', mesiac, km: 180, stav: 'rozpracovana', odchod_z: 'Bratislava', prichod_do: 'Pezinok' },
  { user: 'demo.managerA@imet.sk', vozidlo: 'DEMO003', mesiac: lastMonth, km: 1200, stav: 'spracovana', cislo_dokladu: '2026-D002', odchod_z: 'Bratislava', prichod_do: 'Košice', naklady_celkom: 380.00 },
]
for (const j of jazdy) {
  await sb.from('jazdy').insert({
    user_id: ids[j.user], vozidlo_id: vehicleIds[j.vozidlo],
    mesiac: j.mesiac, km: j.km, typ: 'firemne_doma',
    odchod_z: j.odchod_z, prichod_do: j.prichod_do,
    cas_odchodu: '08:00', cas_prichodu: '16:00',
    stav: j.stav, cislo_dokladu: j.cislo_dokladu || null,
    naklady_celkom: j.naklady_celkom || null,
  })
}
ok(`${jazdy.length} jázd (rôzne stavy)`)

// DOVOLENKY (rôzne stavy + Manager A skutočne na dovolenke aby zastupovanie fungovalo)
const futureFrom = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0] }
const dovolenky = [
  // Manager A je TERAZ na dovolenke (od včera +5 dní) — preto zastupuje Manager B
  { user: 'demo.managerA@imet.sk', od: futureFrom(-1), do: futureFrom(5), typ: 'dovolenka', stav: 'schvalena', schvalovatel: 'demo.gr@imet.sk' },
  { user: 'demo.zam1@imet.sk', od: futureFrom(10), do: futureFrom(14), typ: 'dovolenka', stav: 'caka_na_schvalenie', schvalovatel: 'demo.managerA@imet.sk' },
  { user: 'demo.zam2@imet.sk', od: futureFrom(20), do: futureFrom(20), typ: 'dovolenka', stav: 'caka_na_schvalenie', schvalovatel: 'demo.managerA@imet.sk', pol_dna: true, cast_dna: 'dopoludnie' },
  { user: 'demo.zam3@imet.sk', od: futureFrom(-5), do: futureFrom(-3), typ: 'sick_leave', stav: 'schvalena', schvalovatel: 'demo.managerB@imet.sk' },
  { user: 'demo.zam4@imet.sk', od: futureFrom(7), do: futureFrom(7), typ: 'ocr', stav: 'caka_na_schvalenie', schvalovatel: 'demo.managerB@imet.sk' },
]
for (const d of dovolenky) {
  await sb.from('dovolenky').insert({
    user_id: ids[d.user], datum_od: d.od, datum_do: d.do,
    typ: d.typ, stav: d.stav, schvalovatel_id: ids[d.schvalovatel],
    schvalene_at: d.stav === 'schvalena' ? new Date().toISOString() : null,
    pol_dna: d.pol_dna || false, cast_dna: d.cast_dna || null,
  })
}
ok(`${dovolenky.length} dovoleniek (vrátane sick_leave a OČR)`)

// DOVOLENKOVÉ NÁROKY pre 2026
for (const acc of accounts) {
  await sb.from('dovolenky_naroky').insert({
    user_id: ids[acc.email], rok: 2026,
    narok_dni: acc.full_name.includes('Generálny') ? 25 : 20,
    prenesene_dni: 2,
  })
}
ok('Dovolenkové nároky 2026 pre všetkých')

// SLUŽOBNÉ CESTY
const cesty = [
  { user: 'demo.zam1@imet.sk', od: futureFrom(15), do: futureFrom(16), ciel: 'Žilina', ucel: 'Stretnutie s klientom', typ: 'domaca', krajina: 'SK', stav: 'schvalena', schvalovatel: 'demo.managerA@imet.sk' },
  { user: 'demo.zam2@imet.sk', od: futureFrom(25), do: futureFrom(27), ciel: 'Wien', ucel: 'Konferencia', typ: 'zahranicna', krajina: 'AT', stav: 'caka_na_schvalenie', schvalovatel: 'demo.managerA@imet.sk', preddavok: 350.00 },
  { user: 'demo.managerB@imet.sk', od: futureFrom(8), do: futureFrom(8), ciel: 'Trnava', ucel: 'Audit pobočky', typ: 'domaca', krajina: 'SK', stav: 'caka_na_schvalenie', schvalovatel: 'demo.gr@imet.sk' },
]
for (const c of cesty) {
  const stavMap = { 'schvalena': 'schvalena', 'caka_na_schvalenie': 'nova' }
  await sb.from('sluzobne_cesty').insert({
    user_id: ids[c.user], datum_od: c.od, datum_do: c.do,
    ciel: c.ciel, ucel: c.ucel, doprava: 'firemne_auto',
    predpokladany_km: 200, typ_cesty: c.typ, krajina: c.krajina, mena: 'EUR',
    stav: stavMap[c.stav], schvalovatel_id: ids[c.schvalovatel],
    schvalene_at: c.stav === 'schvalena' ? new Date().toISOString() : null,
    preddavok_suma: c.preddavok || null,
    preddavok_stav: c.preddavok ? 'ziadany' : null,
    vyuctovanie_stav: c.stav === 'schvalena' ? 'caka_na_doklady' : null,
  })
}
ok(`${cesty.length} služobných ciest`)

// DOCHÁDZKA — posledné 5 dní pre 4 zamestnancov
const dochadzkaUsers = ['demo.zam1@imet.sk', 'demo.zam2@imet.sk', 'demo.zam3@imet.sk', 'demo.zam4@imet.sk']
let dochadzkaCount = 0
for (let dayOffset = -5; dayOffset <= -1; dayOffset++) {
  const dt = new Date(); dt.setDate(dt.getDate() + dayOffset)
  if (dt.getDay() === 0 || dt.getDay() === 6) continue
  const datum = dt.toISOString().split('T')[0]
  for (const u of dochadzkaUsers) {
    await sb.from('dochadzka').insert([
      { user_id: ids[u], datum, smer: 'prichod', dovod: 'praca', cas: `${datum}T07:55:00Z`, zdroj: 'pin' },
      { user_id: ids[u], datum, smer: 'odchod', dovod: 'praca', cas: `${datum}T16:30:00Z`, zdroj: 'pin' },
    ])
    dochadzkaCount += 2
  }
}
ok(`${dochadzkaCount} dochádzkových záznamov (príchod/odchod posledné prac. dni)`)

// VOZIDLO SERVISY
for (const spz of Object.keys(vehicleIds)) {
  await sb.from('vozidlo_servisy').insert({
    vozidlo_id: vehicleIds[spz], datum: futureFrom(-30),
    typ: 'servis', cena: 320.50, km_pri_servise: 49500,
    nasledny_servis_km: 60000, nasledny_servis_datum: futureFrom(335),
    interval_km: 15000, interval_mesiace: 12,
    popis: '[DEMO] Pravidelný servis', stav: 'dokoncene',
  })
}
ok(`${vehicles.length} servisov`)

// VOZIDLO KONTROLY (STK)
for (const spz of Object.keys(vehicleIds)) {
  await sb.from('vozidlo_kontroly').insert({
    vozidlo_id: vehicleIds[spz], typ: 'stk',
    datum_vykonania: futureFrom(-180), platnost_do: futureFrom(550), cena: 50,
  })
}
ok(`${vehicles.length} STK kontrol`)

// HLÁSENIE
await sb.from('vozidlo_hlasenia').insert({
  vozidlo_id: vehicleIds['DEMO001'], user_id: ids['demo.zam1@imet.sk'],
  popis: '[DEMO] Tichý zvuk pri brzdení', priorita: 'normalna', stav: 'nove',
})
ok('1 hlásenie (DEMO001)')

// POISTNÁ UDALOSŤ
await sb.from('poistne_udalosti').insert({
  vozidlo_id: vehicleIds['DEMO002'], user_id: ids['demo.zam2@imet.sk'],
  datum: futureFrom(-10), miesto: '[DEMO] Bratislava parkovisko Tesco',
  popis: '[DEMO] Drobné poškodenie zadného nárazníka',
  cislo_poistky: 'POL-DEMO-001', skoda_odhad: 800, skoda_skutocna: 750,
  poistovna_plnenie: 650, spoluucast: 100, stav: 'riesena',
})
ok('1 poistná udalosť (DEMO002)')

// TANKOVÉ KARTY
await sb.from('tankove_karty').insert([
  { cislo_karty: 'DEMO-CARD-001', typ: 'shell', vozidlo_id: vehicleIds['DEMO001'], stav: 'aktivna', limit_mesacny: 300 },
  { cislo_karty: 'DEMO-CARD-002', typ: 'omv', vodic_id: ids['demo.fleet@imet.sk'], stav: 'aktivna', limit_mesacny: 500 },
])
ok('2 tankové karty (jedna na vozidlo, jedna na vodiča)')

// TANKOVANIE
await sb.from('vozidlo_tankovanie').insert({
  vozidlo_id: vehicleIds['DEMO001'], datum: futureFrom(-3),
  litrov: 45, cena_za_liter: 1.485, celkova_cena: 66.83,
  km_na_tachometri: 50200, plna_naplna: true,
  created_by: ids['demo.zam1@imet.sk'],
})
ok('1 tankovanie (DEMO001)')

// ŠKOLENIA
for (const u of dochadzkaUsers) {
  await sb.from('skolenia').insert([
    { profile_id: ids[u], typ: 'bozp', nazov: '[DEMO] BOZP úvodné', datum_absolvovany: '2025-01-15', platnost_do: futureFrom(60), stav: 'platne' },
    { profile_id: ids[u], typ: 'pozarna_ochrana', nazov: '[DEMO] Požiarna ochrana', datum_absolvovany: '2025-02-20', platnost_do: futureFrom(400), stav: 'platne' },
  ])
}
ok(`${dochadzkaUsers.length * 2} školení`)

// ONBOARDING
for (const u of dochadzkaUsers) {
  await sb.from('onboarding_items').insert([
    { profile_id: ids[u], typ: 'dokument', nazov: '[DEMO] Pracovná zmluva podpísaná', splnene: true, splnene_datum: '2025-01-01T00:00:00Z' },
    { profile_id: ids[u], typ: 'majetok', nazov: '[DEMO] Notebook + telefón', splnene: true, splnene_datum: '2025-01-02T00:00:00Z' },
    { profile_id: ids[u], typ: 'skolenie', nazov: '[DEMO] BOZP školenie', splnene: false },
  ])
}
ok(`${dochadzkaUsers.length * 3} onboarding položiek`)

// RFID KARTY
let rfidIdx = 1
for (const acc of accounts) {
  await sb.from('rfid_karty').insert({
    user_id: ids[acc.email], kod_karty: `DEMO-RFID-${String(rfidIdx).padStart(3, '0')}`, aktivna: true,
  })
  rfidIdx++
}
ok(`${accounts.length} RFID kariet`)

// ARCHÍV — kategória + dokument s versionovaním
const { data: kategoria } = await sb.from('archiv_kategorie').select('id').eq('nazov', 'Zmluvy').single()
const { data: docV1 } = await sb.from('dokumenty_archiv').insert({
  nazov: '[DEMO] Pracovná zmluva šablóna',
  typ: 'zmluva', file_path: 'demo/zmluva-v1.pdf',
  nahral_id: ids['demo.uctovnik@imet.sk'],
  kategoria_id: kategoria?.id, verzia: 1,
  platnost_do: futureFrom(365), stav: 'schvaleny',
}).select().single()

await sb.from('dokumenty_archiv').insert({
  nazov: '[DEMO] Pracovná zmluva šablóna',
  typ: 'zmluva', file_path: 'demo/zmluva-v2.pdf',
  nahral_id: ids['demo.uctovnik@imet.sk'],
  kategoria_id: kategoria?.id, verzia: 2,
  povodny_dokument_id: docV1.id,
  platnost_do: futureFrom(730), stav: 'schvaleny',
})
ok('2 dokumenty v archíve (v1 + v2 chain)')

// NOTIFIKÁCIE — pre managerov o čakajúcich žiadostiach
await sb.from('notifikacie').insert([
  { user_id: ids['demo.managerA@imet.sk'], typ: 'dovolenka_nova',
    nadpis: '[DEMO] Nová žiadosť o dovolenku',
    sprava: '[DEMO] Ján Zamestnanec 1 žiada dovolenku 10-14 dní vopred',
    link: '/admin/dovolenky' },
  { user_id: ids['demo.gr@imet.sk'], typ: 'cesta_nova',
    nadpis: '[DEMO] Nová žiadosť o cestu',
    sprava: '[DEMO] Anna Vedúca B žiada cestu do Trnavy',
    link: '/admin/sluzobne-cesty' },
])
ok('2 notifikácie')

// ─── SUMMARY ───
log('\n═══════════════════════════════════════')
log('  ✅ DEMO SEED HOTOVÝ')
log('═══════════════════════════════════════\n')

log('Demo účty (heslo: Demo123!):')
log('  📧 demo.gr@imet.sk         — Generálny riaditeľ (it_admin)')
log('  📧 demo.fin@imet.sk        — Finančná riaditeľka (fin_manager)')
log('  📧 demo.uctovnik@imet.sk   — Účtovníčka (admin)')
log('  📧 demo.fleet@imet.sk      — Vedúci vozového parku (fleet_manager)')
log('  📧 demo.managerA@imet.sk   — Vedúci tímu A (na dovolenke → zastúpený B)')
log('  📧 demo.managerB@imet.sk   — Vedúca tímu B (zastupuje A)')
log('  📧 demo.zam1-4@imet.sk     — Zamestnanci')
log('\nVšetky označené [DEMO] v full_name + firma DEMO.')
log('Cleanup: node scripts/demo-seed.mjs (znovu) alebo demo-cleanup.mjs')
