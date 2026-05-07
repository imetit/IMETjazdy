// Migrácia historických faktúr z dokumenty_archiv → faktury
// Spustenie: node scripts/migrate-faktury-data.mjs
//
// Postup:
// 1. SELECT všetky z dokumenty_archiv WHERE typ = 'faktura'
// 2. Mapuj polia + stavy → INSERT do faktury
// 3. Verify count match
// 4. Po manual potvrdení: DELETE z dokumenty_archiv
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=')
  if (k && v) acc[k.trim()] = v.trim()
  return acc
}, {})

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const STAV_MAP = {
  nahrany: 'rozpracovana',
  caka_na_schvalenie: 'caka_na_schvalenie',
  schvaleny: 'schvalena',
  na_uhradu: 'na_uhradu',
  uhradeny: 'uhradena',
  zamietnuty: 'zamietnuta',
  nahradeny: 'stornovana',
  expirujuci: 'rozpracovana',
}

async function main() {
  console.log('=== Migrácia faktúr z dokumenty_archiv ===\n')

  const { data: oldFaktury, error: selErr } = await sb.from('dokumenty_archiv')
    .select('*').eq('typ', 'faktura')
  if (selErr) { console.error('SELECT failed:', selErr.message); process.exit(1) }
  console.log(`Nájdených ${oldFaktury.length} faktúr v dokumenty_archiv`)

  if (oldFaktury.length === 0) { console.log('Nič na migráciu'); return }

  // Default firma — prvá aktívna
  const { data: defaultFirma } = await sb.from('firmy').select('id').eq('aktivna', true).order('poradie').limit(1).single()
  if (!defaultFirma) { console.error('Žiadna aktívna firma'); process.exit(1) }

  let success = 0; let fail = 0
  for (const old of oldFaktury) {
    const novaFaktura = {
      cislo_faktury: old.cislo_faktury || `MIG-${old.id.slice(0, 8)}`,
      dodavatel_nazov: old.dodavatel || 'Migrovaný (neznámy dodávateľ)',
      mena: 'EUR',
      dph_sadzba: 20,
      suma_celkom: Math.max(Math.abs(parseFloat(old.suma) || 0.01), 0.01),
      datum_splatnosti: old.datum_splatnosti || new Date(new Date(old.created_at).getTime() + 14 * 86400000).toISOString().split('T')[0],
      stav: STAV_MAP[old.stav] || 'rozpracovana',
      file_path: old.file_path,
      file_name: old.nazov || 'migrated.pdf',
      file_size: old.file_size,
      mime_type: old.mime_type,
      firma_id: defaultFirma.id,
      kategoria_id: old.kategoria_id,
      popis: old.popis,
      oddelenie: old.oddelenie,
      tagy: old.tagy,
      nahral_id: old.nahral_id,
      schvalil_l1_id: old.schvalovatel_id,
      schvalene_l1_at: old.schvalene_at,
      created_at: old.created_at,
    }

    const { error: insErr } = await sb.from('faktury').insert(novaFaktura)
    if (insErr) {
      console.error(`  ✗ ${old.nazov}: ${insErr.message}`)
      fail++
    } else {
      success++
    }
  }

  console.log(`\n✓ Migrovaných: ${success}`)
  console.log(`✗ Zlyhaní: ${fail}`)
  console.log(`\nPo manuálnej verifikácii spusti DELETE:`)
  console.log(`  DELETE FROM dokumenty_archiv WHERE typ = 'faktura';`)
  console.log(`(NOT DONE automaticky — spusti SQL editor v Supabase)`)
}

main().catch(e => { console.error(e); process.exit(1) })
