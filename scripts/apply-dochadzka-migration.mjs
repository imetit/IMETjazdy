#!/usr/bin/env node
/**
 * Aplikuje migráciu dochádzky cez priame Supabase Postgres connection.
 * Vyžaduje SUPABASE_DB_URL alebo connection details v .env.local.
 *
 * Pretože nemáme prístup k DB heslu, tento skript len overí stav.
 * Migráciu treba aplikovať manuálne cez Supabase Studio:
 *   https://supabase.com/dashboard/project/yotjzvykdpxkwfegjrkr/sql/new
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const [k,...v]=l.split('='); if (k) process.env[k.trim()] = v.join('=').trim() }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

console.log('\n📋 Verifikácia migrácie 20260429000000_dochadzka_mzdy.sql\n')

const checks = [
  { table: 'dochadzka_uzavierka' },
  { table: 'dochadzka_schvalene_hodiny' },
  { table: 'dochadzka_korekcia_ziadosti' },
  { table: 'dochadzka_history' },
]

let pendingCount = 0
for (const c of checks) {
  const { error } = await sb.from(c.table).select('id').limit(1)
  if (error) {
    console.log(`  ❌ ${c.table.padEnd(35)} CHÝBA — ${error.message}`)
    pendingCount++
  } else {
    console.log(`  ✅ ${c.table.padEnd(35)} OK`)
  }
}

// Profile cols
const { error: profileErr } = await sb.from('profiles').select('pristupne_firmy, auto_pip_enabled, fond_per_den').limit(1)
if (profileErr) {
  console.log(`  ❌ profiles new cols              CHÝBA — ${profileErr.message}`)
  pendingCount++
} else {
  console.log(`  ✅ profiles new cols              OK`)
}

// Dochadzka cols
const { error: dochErr } = await sb.from('dochadzka').select('auto_doplnene, korekcia_dovod, povodny_cas, upravil_id, upravene_at').limit(1)
if (dochErr) {
  console.log(`  ❌ dochadzka new cols             CHÝBA — ${dochErr.message}`)
  pendingCount++
} else {
  console.log(`  ✅ dochadzka new cols             OK`)
}

if (pendingCount > 0) {
  console.log(`\n⏳ Migrácia EŠTE NIE JE aplikovaná. Spusti SQL súbor v Supabase Studio:`)
  console.log(`   https://supabase.com/dashboard/project/yotjzvykdpxkwfegjrkr/sql/new`)
  console.log(`   Súbor: supabase/migrations/20260429000000_dochadzka_mzdy.sql`)
  process.exit(1)
} else {
  console.log(`\n✅ Migrácia je aplikovaná. Modul je pripravený.`)
}
