#!/usr/bin/env node
/**
 * IMET DEMO CLEANUP — zmaže všetky demo dáta a účty.
 * Detection: email LIKE 'demo.%@imet.sk', SPZ LIKE 'DEMO%', kategoria DEMO firma.
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

console.log('\n🧹 IMET DEMO CLEANUP\n')

const { data: demoProfiles } = await sb.from('profiles')
  .select('id, email').like('email', 'demo.%@imet.sk')
const ids = (demoProfiles || []).map(p => p.id)

const { data: demoVozidla } = await sb.from('vozidla').select('id').like('spz', 'DEMO%')
const vIds = (demoVozidla || []).map(v => v.id)

console.log(`Nájdených ${ids.length} demo profilov, ${vIds.length} demo vozidiel`)

if (ids.length === 0 && vIds.length === 0) {
  console.log('Žiadne demo dáta. Hotovo.\n')
  process.exit(0)
}

// Cesta_doklady cez sluzobne_cesty
const { data: demoCesty } = await sb.from('sluzobne_cesty').select('id').in('user_id', ids)
if (demoCesty?.length) {
  await sb.from('cesta_doklady').delete().in('cesta_id', demoCesty.map(c => c.id))
  console.log(`  🗑️  cesta_doklady: ${demoCesty.length} ciest`)
}

const tables = [
  { name: 'dochadzka', col: 'user_id', ids },
  { name: 'sluzobne_cesty', col: 'user_id', ids },
  { name: 'dovolenky', col: 'user_id', ids },
  { name: 'dovolenky_naroky', col: 'user_id', ids },
  { name: 'jazdy', col: 'user_id', ids },
  { name: 'notifikacie', col: 'user_id', ids },
  { name: 'audit_log', col: 'user_id', ids },
  { name: 'rfid_karty', col: 'user_id', ids },
  { name: 'skolenia', col: 'profile_id', ids },
  { name: 'onboarding_items', col: 'profile_id', ids },
  { name: 'user_moduly', col: 'user_id', ids },
]
for (const t of tables) {
  if (!t.ids.length) continue
  const { error } = await sb.from(t.name).delete().in(t.col, t.ids)
  if (error) console.log(`  ⚠️  ${t.name}: ${error.message}`)
  else console.log(`  🗑️  ${t.name}`)
}

const vehicleTables = [
  'vozidlo_tankovanie', 'vozidlo_servisy', 'vozidlo_kontroly',
  'vozidlo_hlasenia', 'poistne_udalosti', 'vozidlo_vodici', 'vozidlo_tacho_zaznamy',
]
for (const t of vehicleTables) {
  if (!vIds.length) continue
  const { error } = await sb.from(t).delete().in('vozidlo_id', vIds)
  if (error) console.log(`  ⚠️  ${t}: ${error.message}`)
  else console.log(`  🗑️  ${t}`)
}

// Tankove karty viazané na demo (vozidlo alebo vodič)
if (vIds.length) await sb.from('tankove_karty').delete().in('vozidlo_id', vIds)
if (ids.length) await sb.from('tankove_karty').delete().in('vodic_id', ids)
console.log(`  🗑️  tankove_karty`)

// Demo dokumenty v archíve
await sb.from('dokumenty_archiv').delete().like('nazov', '[DEMO]%')
console.log(`  🗑️  dokumenty_archiv`)

// Unset FK
await sb.from('profiles').update({
  nadriadeny_id: null, vozidlo_id: null, zastupuje_id: null, firma_id: null,
}).in('id', ids)

// Vozidlá
if (vIds.length) await sb.from('vozidla').delete().in('id', vIds)
console.log(`  🗑️  vozidla: ${vIds.length}`)

// Auth users
for (const id of ids) {
  await sb.auth.admin.deleteUser(id)
}
console.log(`  🗑️  auth users: ${ids.length}`)

// Demo firma
await sb.from('firmy').delete().eq('kod', 'DEMO')
console.log(`  🗑️  firmy: DEMO`)

console.log('\n✅ Hotovo.\n')
