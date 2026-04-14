#!/usr/bin/env node
/**
 * Import zamestnancov z TSV exportu starej dochádzky.
 *
 * Vytvára LEN KOSTRY — iba meno, priezvisko, datum_nastupu, oddelenie → pozicia.
 * Firma, typ úväzku, pracovný fond, PIN, nadriadený → admin nastaví manuálne
 * v admin paneli (/admin/zamestnanci).
 *
 * Preskakuje:
 *   - Ukončených (oddelenie = "Ukončení" alebo Zamestnaný_do < dnes)
 *   - Testovacie účty (99999xxx ID, meno "Dočasná", priezvisko "Imeťák", …)
 *
 * Každý nový profile dostane dummy email:
 *   {slug(meno)}.{slug(priezvisko)}@import.imet.sk
 *   (ak už existuje, príjme suffix -2, -3, …)
 *
 * Použitie:
 *   node scripts/import-zamestnanci.mjs --file private/export-2026-04-14.tsv --dry-run
 *   node scripts/import-zamestnanci.mjs --file private/export-2026-04-14.tsv
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
      const val = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true'
      acc.push([cur.slice(2), val])
    }
    return acc
  }, [])
)

const file = args.file
const dryRun = args['dry-run'] === 'true'

if (!file) {
  console.error('Usage: node scripts/import-zamestnanci.mjs --file <tsv> [--dry-run]')
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

// Parser anchorovaný na dátumy sprava (DD.MM.YYYY) — zvláda rôzny počet tab-ov
function parseLine(line) {
  const m = line.match(/^(\S+)\t(.*?)(\d{2}\.\d{2}\.\d{4})(?:\t(\d{2}\.\d{2}\.\d{4}))?\s*$/)
  if (!m) return null
  const parts = m[2].split('\t')
  return {
    id: m[1],
    titul: (parts[0] || '').trim(),
    meno: (parts[1] || '').trim(),
    priezvisko: (parts[2] || '').trim(),
    oddelenie: (parts[3] || '').trim(),
    datumOd: m[3],
    datumDo: m[4] || null,
  }
}

function isTestAccount(r) {
  if (r.id.startsWith('99999')) return true
  if (r.oddelenie === 'TEST') return true
  if (/^(DvS|DVS|MM|BP)$/i.test(r.meno) || /^(DvS|DVS|MM|BP)$/i.test(r.priezvisko)) return true
  if (/^Dočasná$/i.test(r.meno)) return true
  if (r.priezvisko === 'Imeťák') return true
  if (/^\d+$/.test(r.priezvisko)) return true
  return false
}

function isActive(r, today) {
  if (r.oddelenie === 'Ukončení') return false
  if (!r.datumDo) return true
  const d = parseDate(r.datumDo)
  if (!d) return true
  return new Date(d) > today
}

async function main() {
  const text = readFileSync(file, 'utf-8')
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('ID\t'))
  const today = new Date('2026-04-14')

  const raw = lines.map(parseLine).filter(Boolean)
  const real = raw.filter(r => !isTestAccount(r))
  const active = real.filter(r => isActive(r, today))

  // Dedup podľa (meno, priezvisko), ber najnovší datumOd
  const keyFor = r => `${r.meno.toLowerCase()}|${r.priezvisko.toLowerCase()}`
  const byKey = new Map()
  for (const r of active) {
    const k = keyFor(r)
    const existing = byKey.get(k)
    if (!existing) byKey.set(k, r)
    else {
      const a = parseDate(existing.datumOd)
      const b = parseDate(r.datumOd)
      if (b && a && new Date(b) > new Date(a)) byKey.set(k, r)
    }
  }
  const uniqueActive = [...byKey.values()]

  console.log(`Spracujem ${uniqueActive.length} aktívnych (z ${raw.length} riadkov)${dryRun ? ' — DRY RUN' : ''}\n`)

  let created = 0, skipped = 0, failed = 0
  const usedEmails = new Set()

  for (const r of uniqueActive) {
    const full_name = [r.titul, r.meno, r.priezvisko].filter(Boolean).join(' ').trim()
    const datumNastupu = parseDate(r.datumOd)
    const pozicia = r.oddelenie || null

    // Email — dummy, unique
    let base = `${slug(r.meno)}.${slug(r.priezvisko)}@import.imet.sk`
    let email = base
    let n = 1
    while (usedEmails.has(email)) { n++; email = base.replace('@', `-${n}@`) }
    usedEmails.add(email)

    console.log(`  ${full_name.padEnd(40)}  nástup=${datumNastupu || '?'}  odd="${pozicia || ''}"`)

    if (dryRun) { created++; continue }

    // Preskočiť ak existuje v DB
    const { data: ex } = await supabase.from('profiles').select('id').ilike('full_name', full_name).maybeSingle()
    if (ex) { console.log('    ℹ existuje'); skipped++; continue }

    // Unikátnosť emailu v DB
    const { data: exEmail } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
    if (exEmail) {
      email = email.replace('@', `-${Date.now().toString(36)}@`)
    }

    const password = crypto.randomBytes(24).toString('hex')
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'zamestnanec', imported: true },
    })
    if (authErr || !authData.user) {
      console.error('    ✗ auth:', authErr?.message)
      failed++
      continue
    }

    const { error: profErr } = await supabase.from('profiles').update({
      full_name,
      pozicia,
      datum_nastupu: datumNastupu,
      typ_uvazku: 'tpp',
      active: true,
    }).eq('id', authData.user.id)
    if (profErr) { console.error('    ✗ profile:', profErr.message); failed++; continue }
    created++
  }

  console.log(`\nHotovo: ${created} vytvorených, ${skipped} preskočených, ${failed} chýb.`)
  console.log('\nĎalší krok: otvor /admin/zamestnanci a priradaj firmy / fond / typ úväzku cez dropdowny.')
}

main().catch(e => { console.error(e); process.exit(1) })
