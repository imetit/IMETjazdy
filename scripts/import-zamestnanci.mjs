#!/usr/bin/env node
/**
 * Import zamestnancov z CSV/XLSX exportu starej dochádzky.
 *
 * Použitie:
 *   node scripts/import-zamestnanci.mjs --file private/zamestnanci.csv --firma AKE_SKALICA --dry-run
 *   node scripts/import-zamestnanci.mjs --file private/zamestnanci.csv --firma AKE_SKALICA
 *
 * Očakávané stĺpce CSV (auto-detekt podľa hlavičky):
 *   - meno, priezvisko (povinne)
 *   - oddelenie (text, voľný)
 *   - datum_nastupu (YYYY-MM-DD alebo DD.MM.YYYY)
 *   - tyzdnovy_fond alebo fond_tyzden (hodín / týždeň, napr. 40, 42.5)
 *   - pracovne_dni_tyzdne (voliteľné, default 5)
 *
 * Pre každého:
 *   1. Vygeneruje dummy email: {meno}.{priezvisko}-{FIRMA_KOD}@internal.imet.sk
 *   2. Vytvorí auth user (random password — never used, vstup cez tablet PIN/RFID)
 *   3. Vytvorí profile: role=zamestnanec, typ_uvazku=tpp, firma_id=<firma>, tyzdnovy_fond, pracovne_dni, datum_nastupu, pozicia=oddelenie
 *
 * Pri --dry-run nič nezapisuje, iba vypíše plán.
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import crypto from 'crypto'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) {
      const key = cur.slice(2)
      const val = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true'
      acc.push([key, val])
    }
    return acc
  }, [])
)

const file = args.file
const firmaKod = args.firma
const dryRun = args['dry-run'] === 'true'

if (!file || !firmaKod) {
  console.error('Usage: node scripts/import-zamestnanci.mjs --file <path> --firma <KOD> [--dry-run]')
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

function slug(s) {
  return String(s).trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function parseDate(s) {
  if (!s) return null
  const v = String(s).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

function parseFloatSafe(s, def) {
  if (s === null || s === undefined || s === '') return def
  const n = parseFloat(String(s).replace(',', '.'))
  return isNaN(n) ? def : n
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const header = lines[0].split(sep).map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const cells = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(header.map((h, i) => [h, cells[i] || '']))
  })
}

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k]
  }
  return ''
}

async function main() {
  // 1. Load firma
  const { data: firma } = await supabase.from('firmy').select('*').eq('kod', firmaKod).single()
  if (!firma) {
    console.error(`Firma s kódom "${firmaKod}" neexistuje.`)
    process.exit(1)
  }
  console.log(`Firma: ${firma.nazov} (${firma.kod})`)

  // 2. Parse CSV
  const text = readFileSync(file, 'utf-8')
  const rows = parseCsv(text)
  console.log(`Spracúvam ${rows.length} riadkov${dryRun ? ' (DRY RUN)' : ''}...`)

  let created = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    const meno = pick(row, ['meno', 'first_name'])
    const priezvisko = pick(row, ['priezvisko', 'surname', 'last_name'])
    if (!meno || !priezvisko) {
      console.warn('  ! chýba meno alebo priezvisko, skip:', row)
      skipped++
      continue
    }

    const full_name = `${meno} ${priezvisko}`.trim()
    const oddelenie = pick(row, ['oddelenie', 'department'])
    const datumNastupu = parseDate(pick(row, ['datum_nastupu', 'nastup', 'zamestnany_od']))
    const tyzdnovy = parseFloatSafe(pick(row, ['tyzdnovy_fond', 'fond_tyzden', 'fond', 'tyzden_h', 'hodiny_tyzden']), 40)
    const pracovneDni = parseFloatSafe(pick(row, ['pracovne_dni_tyzdne', 'dni_tyzden']), 5)
    const email = `${slug(meno)}.${slug(priezvisko)}-${firma.kod}@internal.imet.sk`

    console.log(`  → ${full_name}  ${firma.kod}  fond=${tyzdnovy}h/${pracovneDni}d  nástup=${datumNastupu || 'N/A'}  odd=${oddelenie || '-'}  email=${email}`)

    if (dryRun) { created++; continue }

    // Check if user already exists by email
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
    if (existing) {
      console.log('    ℹ existuje, skip')
      skipped++
      continue
    }

    const password = crypto.randomBytes(24).toString('hex')
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'zamestnanec', imported: true },
    })
    if (authErr || !authData.user) {
      console.error('    ✗ auth fail:', authErr?.message)
      failed++
      continue
    }

    const { error: profErr } = await supabase.from('profiles').update({
      firma_id: firma.id,
      full_name,
      pozicia: oddelenie || null,
      tyzdnovy_fond_hodiny: tyzdnovy,
      pracovne_dni_tyzdne: pracovneDni,
      pracovny_fond_hodiny: +(tyzdnovy / pracovneDni).toFixed(2),
      datum_nastupu: datumNastupu,
      typ_uvazku: 'tpp',
      active: true,
    }).eq('id', authData.user.id)
    if (profErr) {
      console.error('    ✗ profile fail:', profErr.message)
      failed++
      continue
    }
    created++
  }

  console.log(`\nHotovo: ${created} vytvorených, ${skipped} preskočených, ${failed} chýb.`)
}

main().catch(e => { console.error(e); process.exit(1) })
