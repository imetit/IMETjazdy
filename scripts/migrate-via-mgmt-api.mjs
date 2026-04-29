#!/usr/bin/env node
/**
 * Pokus o aplikáciu migrácie cez Supabase Management API.
 * Vyžaduje SUPABASE_ACCESS_TOKEN env (sbp_...) — Personal Access Token zo Supabase dashboard → Account → Access Tokens.
 */
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const [k,...v]=l.split('='); if (k) process.env[k.trim()] = v.join('=').trim() }

const projectRef = 'yotjzvykdpxkwfegjrkr'
const token = process.env.SUPABASE_ACCESS_TOKEN

if (!token) {
  console.log('\n⚠️  SUPABASE_ACCESS_TOKEN nie je nastavený v .env.local')
  console.log('\nVytvor token: https://supabase.com/dashboard/account/tokens')
  console.log('Pridaj do .env.local: SUPABASE_ACCESS_TOKEN=sbp_xxxxx')
  console.log('Alebo aplikuj migráciu manuálne cez Supabase Studio:')
  console.log(`  https://supabase.com/dashboard/project/${projectRef}/sql/new`)
  process.exit(1)
}

const sql = fs.readFileSync('supabase/migrations/20260429000000_dochadzka_mzdy.sql', 'utf8')
const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

console.log(`Aplikujem migráciu cez Management API...`)
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})

if (!res.ok) {
  console.log(`❌ HTTP ${res.status}: ${await res.text()}`)
  process.exit(1)
}

console.log(`✅ Migrácia aplikovaná`)
const result = await res.json().catch(() => null)
if (result) console.log(JSON.stringify(result, null, 2))
