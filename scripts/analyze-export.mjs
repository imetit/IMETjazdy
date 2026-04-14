#!/usr/bin/env node
/**
 * Analyzuje TSV export starej dochádzky IMET.
 * Formát: ID <TAB> Titul <TAB> Meno <TAB> Priezvisko <TAB> Oddelenie <TAB> (prázdne) <TAB> Zamestnaný_od <TAB> Zamestnaný_do
 *
 * Použitie: node scripts/analyze-export.mjs --file private/export-2026-04-14.tsv
 */

import { readFileSync } from 'fs'

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
if (!file) { console.error('--file required'); process.exit(1) }

const text = readFileSync(file, 'utf-8')
const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('ID\t'))

// Parser: anchor na dátumy sprava (DD.MM.YYYY)
function parseLine(line) {
  const m = line.match(/^(\S+)\t(.*?)(\d{2}\.\d{2}\.\d{4})(?:\t(\d{2}\.\d{2}\.\d{4}))?\s*$/)
  if (!m) return null
  const id = m[1]
  const middle = m[2]
  const datumOd = m[3]
  const datumDo = m[4] || null

  // middle obsahuje: Titul<TAB>Meno<TAB>Priezvisko<TAB>Oddelenie<TAB><TAB>
  // Rozdelíme po \t a vynecháme prázdne tail-y
  const parts = middle.split('\t')
  const titul = (parts[0] || '').trim()
  const meno = (parts[1] || '').trim()
  const priezvisko = (parts[2] || '').trim()
  const oddelenie = (parts[3] || '').trim()
  return { id, titul, meno, priezvisko, oddelenie, datumOd, datumDo }
}

function parseDate(s) {
  if (!s) return null
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  return new Date(`${m[3]}-${m[2]}-${m[1]}`)
}

const today = new Date('2026-04-14')

function isActive(r) {
  if (r.oddelenie === 'Ukončení') return false
  if (!r.datumDo) return true
  const d = parseDate(r.datumDo)
  return d && d > today
}

function isTestAccount(r) {
  if (r.id.startsWith('99999')) return true
  if (r.oddelenie === 'TEST') return true
  if (/^(DvS|DVS|MM|BP)\b/i.test(r.meno) || /^(DvS|DVS|MM|BP)\b/i.test(r.priezvisko)) return true
  if (/^Dočasná$/i.test(r.meno)) return true
  if (r.priezvisko === 'Imeťák') return true
  if (/^\d+$/.test(r.priezvisko)) return true  // "1111", "3579" atď.
  return false
}

function firmaFromOddelenie(odd) {
  if (!odd) return '?EMPTY'
  const s = odd.trim()
  const l = s.toLowerCase()
  if (l.startsWith('imet-tec')) return 'IMET_TEC'
  if (l.includes('imet-ake_košice') || l.includes('imet-ake_ke')) return 'IMET_KE (AKE)'
  if (l.startsWith('imet-ake_zvolen')) return 'AKE_ZVOLEN'
  if (l.startsWith('imet-ake')) return 'AKE_BA'
  if (l.includes('skalica')) return 'AKE_SKALICA'
  if (l.startsWith('squash')) return 'SQUASH'
  if (l.startsWith('imet_')) return 'IMET (matka BA)'
  if (l === 'ukončení' || l === 'test') return '?SKIP'
  // neprefixované oddelenia → pravdepodobne hotelové/reštauračné pod matkou alebo iná dcéra
  return 'HOTEL_RESTAURANT (?)'
}

// Fond parser
function parseFond(odd) {
  if (!odd) return null
  // 40h, 40,3h, 37,5 hod, 35h, 30h, 25h, 22,5h, 7,2
  const m1 = odd.match(/(\d{1,2}[,.]?\d*)\s*(h|hod)\b/i)
  if (m1) return parseFloat(m1[1].replace(',', '.'))
  // 0600-1430 etc (time range)
  const m2 = odd.match(/(\d{2})(\d{2})-(\d{2})(\d{2})/)
  if (m2) {
    const start = parseInt(m2[1]) + parseInt(m2[2]) / 60
    const end = parseInt(m2[3]) + parseInt(m2[4]) / 60
    const hours = end - start
    return +(hours * 5).toFixed(1)  // ×5 dní = týždňový fond
  }
  return null
}

const records = lines.map(parseLine).filter(Boolean)
const test = records.filter(isTestAccount)
const real = records.filter(r => !isTestAccount(r))
const active = real.filter(isActive)
const inactive = real.filter(r => !isActive(r))

// Dedup aktívnych (Meno+Priezvisko) — ber najnovší
function keyFor(r) { return `${r.meno.toLowerCase()}|${r.priezvisko.toLowerCase()}` }
const activeByKey = new Map()
for (const r of active) {
  const k = keyFor(r)
  const existing = activeByKey.get(k)
  if (!existing) activeByKey.set(k, r)
  else {
    const existingFrom = parseDate(existing.datumOd)
    const newFrom = parseDate(r.datumOd)
    if (newFrom > existingFrom) activeByKey.set(k, r)
  }
}
const uniqueActive = [...activeByKey.values()]

// Skupiny podľa firmy
const firmaBuckets = new Map()
for (const r of uniqueActive) {
  const f = firmaFromOddelenie(r.oddelenie)
  if (!firmaBuckets.has(f)) firmaBuckets.set(f, [])
  firmaBuckets.get(f).push(r)
}

// Unique oddelenia
const oddelBuckets = new Map()
for (const r of uniqueActive) {
  const o = r.oddelenie
  oddelBuckets.set(o, (oddelBuckets.get(o) || 0) + 1)
}

// Duplicita: aktívny v 2 firmách
const byPerson = new Map()
for (const r of uniqueActive) {
  // Fuzzy dedupe by full name normalized (already done), but check if same person
  // appears in export with different oddelenia across multiple rows (we only kept 1)
  // So instead: check original active[] for multi-firma
}
const multiFirma = new Map()
for (const r of active) {
  const k = keyFor(r)
  if (!multiFirma.has(k)) multiFirma.set(k, new Set())
  multiFirma.get(k).add(firmaFromOddelenie(r.oddelenie))
}
const peopleInMultipleFirms = [...multiFirma.entries()].filter(([, fs]) => fs.size > 1)

// ========================================
// REPORT
// ========================================

console.log('='.repeat(70))
console.log('ANALÝZA EXPORTU IMET DOCHÁDZKA — 2026-04-14')
console.log('='.repeat(70))
console.log(`\nTotal záznamov (riadkov v exporte): ${records.length}`)
console.log(`  z toho testovacie účty:       ${test.length}`)
console.log(`  z toho reálni ľudia:          ${real.length}`)
console.log(`    z toho ukončení:            ${inactive.length}`)
console.log(`    z toho aktívni (všetky):    ${active.length}`)
console.log(`    z toho aktívni (unique):    ${uniqueActive.length}`)

console.log('\n--- PODĽA FIRMY (iba aktívni, unique) ---')
const sortedFirmy = [...firmaBuckets.entries()].sort((a, b) => b[1].length - a[1].length)
for (const [firma, people] of sortedFirmy) {
  console.log(`  ${firma.padEnd(25)} ${people.length}`)
}

console.log('\n--- UNIQUE ODDELENIA (top 30 podľa počtu aktívnych) ---')
const sortedOddel = [...oddelBuckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
for (const [odd, count] of sortedOddel) {
  const firma = firmaFromOddelenie(odd)
  const fond = parseFond(odd)
  console.log(`  [${count.toString().padStart(3)}]  "${odd}"  →  ${firma}${fond ? `  (fond=${fond}h/týž)` : ''}`)
}

console.log('\n--- ODDELENIA BEZ PREFIXU FIRMY (hotelové/reštauračné?) ---')
const noPrefix = [...oddelBuckets.entries()]
  .filter(([odd]) => firmaFromOddelenie(odd) === 'HOTEL_RESTAURANT (?)')
  .sort((a, b) => b[1] - a[1])
for (const [odd, count] of noPrefix) {
  console.log(`  [${count.toString().padStart(3)}]  "${odd}"`)
}

console.log('\n--- ĽUDIA AKTÍVNI VO VIAC FIRMÁCH ---')
if (peopleInMultipleFirms.length === 0) {
  console.log('  (žiadni)')
} else {
  for (const [name, firmaSet] of peopleInMultipleFirms) {
    console.log(`  ${name.padEnd(40)} → ${[...firmaSet].join(' + ')}`)
  }
}

console.log('\n--- TESTOVACIE ÚČTY (na preskočenie pri importe) ---')
for (const r of test) {
  console.log(`  ${r.id}  ${r.meno} ${r.priezvisko}  "${r.oddelenie}"`)
}
