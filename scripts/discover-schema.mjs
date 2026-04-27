#!/usr/bin/env node
/**
 * Discover skutočné schémy kľúčových tabuliek + check constraints.
 * Používa pg_catalog cez REST query.
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

const TABLES = [
  'vozidla', 'vozidlo_servisy', 'vozidlo_kontroly', 'vozidlo_hlasenia',
  'vozidlo_vodici', 'vozidlo_tacho_zaznamy', 'poistne_udalosti',
  'jazdy', 'dochadzka', 'dovolenky', 'sluzobne_cesty', 'cesta_doklady',
  'tankove_karty', 'vozidlo_tankovanie', 'dokumenty_archiv',
  'audit_log', 'firmy', 'profiles', 'sadzby',
]

console.log('\n=== TABLE STRUCTURES (z prvého riadku) ===\n')
for (const t of TABLES) {
  const { data, error } = await sb.from(t).select('*').limit(1)
  if (error) { console.log(`❌ ${t}: ${error.message}`); continue }
  if (!data || data.length === 0) {
    // Pokus o insert prázdny + zachytí error so všetkými NOT NULL
    console.log(`📦 ${t}: (prázdna)`)
    continue
  }
  console.log(`📦 ${t}: ${Object.keys(data[0]).join(', ')}`)
}

console.log('\n=== FIRMY ZOZNAM ===')
const { data: firmy } = await sb.from('firmy').select('kod, nazov, aktivna, moduly').order('poradie')
for (const f of firmy || []) {
  console.log(`  ${f.aktivna ? '✓' : '✗'} ${f.kod.padEnd(15)} ${f.nazov} → ${JSON.stringify(f.moduly)}`)
}

console.log('\n=== CHECK CONSTRAINTS via pg_get_constraintdef ===')
// Use RPC if exists, else fallback to direct insert errors
const { data: constraints, error: cErr } = await sb.rpc('exec_sql', {
  sql: `SELECT conname, pg_get_constraintdef(oid) AS def
        FROM pg_constraint
        WHERE conrelid IN (
          'public.dochadzka'::regclass,
          'public.dovolenky'::regclass,
          'public.sluzobne_cesty'::regclass,
          'public.tankove_karty'::regclass
        ) AND contype = 'c'`,
})
if (cErr) {
  console.log(`(no RPC exec_sql, ${cErr.message})`)
  // Fallback: pokus o vytiahnutie cez REST priamo
} else {
  for (const c of constraints || []) console.log(`  ${c.conname}: ${c.def}`)
}

// Pokus o tankova_karta DOUBLE insert — kontrola či constraint existuje
console.log('\n=== CONSTRAINT TEST: tankova karta s OBOMA ===')
const { data: vozidlo } = await sb.from('vozidla').select('id').limit(1).single()
const { data: profil } = await sb.from('profiles').select('id').eq('active', true).limit(1).single()
if (vozidlo && profil) {
  const cislo = `__test_constraint_${Date.now()}`
  const { data, error } = await sb.from('tankove_karty').insert({
    cislo_karty: cislo,
    typ: 'ina',
    vozidlo_id: vozidlo.id,
    vodic_id: profil.id,
    stav: 'aktivna',
  }).select()
  if (error) console.log(`  ✓ Constraint funguje (zablokované): ${error.message}`)
  else {
    console.log(`  ❌ BUG: insert prešiel s OBOMA. Mažem...`)
    await sb.from('tankove_karty').delete().eq('cislo_karty', cislo)
  }
}
