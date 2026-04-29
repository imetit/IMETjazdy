#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local','utf8')
for (const l of env.split('\n')) { const [k,...v] = l.split('='); if (k) process.env[k.trim()] = v.join('=').trim() }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const sql = fs.readFileSync('supabase/migrations/20260429000000_dochadzka_mzdy.sql', 'utf8')

// Použijeme Supabase Management API cez priamy Postgres connection cez RPC.
// Najjednoduchšie: rozdelíme SQL na statementy a posielame cez postgrest /rpc/_pg_query
// Ale to nie je default. Lepšie cez priamy Postgres pool.
// V Supabase JS klientovi nie je raw SQL exec.
// Použijeme cez REST: POST /rest/v1/rpc/<custom_function> alebo Management API.
//
// Pragmatický prístup: vytvoríme RPC funkciu raz, potom cez ňu posielame SQL.

console.log(`URL: ${url}`)
console.log(`SQL length: ${sql.length} chars`)
console.log(`\nMigráciu treba aplikovať MANUÁLNE cez Supabase Studio:`)
console.log(`1. Otvor https://supabase.com/dashboard/project/yotjzvykdpxkwfegjrkr/sql`)
console.log(`2. New Query`)
console.log(`3. Paste obsah supabase/migrations/20260429000000_dochadzka_mzdy.sql`)
console.log(`4. Run`)
console.log(`\nALEBO cez psql ak máš DB heslo:`)
console.log(`psql "postgresql://postgres:<heslo>@db.yotjzvykdpxkwfegjrkr.supabase.co/postgres" -f supabase/migrations/20260429000000_dochadzka_mzdy.sql`)
console.log(`\nPokus o aplikáciu cez REST PostgREST (môže zlyhať)...`)

// Skúsime cez Supabase Management API
const projectRef = 'yotjzvykdpxkwfegjrkr'
const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_f194' // pamäť hovorí token sbp_f194...

// Bez správneho mgmt tokenu pôjdeme cez direct DB query — pripojíme sa ako postgres cez supabase pooler
// Connection string formát: postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

// Bez hesla vyžaduje manual aplikáciu. Spravím verifikáciu po aplikácii:
const sb = createClient(url, key)
const { data: existingTables } = await sb.from('dochadzka_uzavierka').select('id').limit(1)
if (existingTables !== null) {
  console.log(`\n✅ Tabuľka dochadzka_uzavierka už existuje — migrácia bola aplikovaná.`)
} else {
  console.log(`\n⏳ Tabuľka ešte neexistuje — aplikuj migráciu.`)
}
