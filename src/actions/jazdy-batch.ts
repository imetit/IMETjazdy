'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { calculateVyuctovanie, generateDocNumber } from '@/lib/calculations'
import { createNotifikacia } from './notifikacie'
import { logAudit } from './audit'
import { revalidatePath } from 'next/cache'
import type { Settings, Paliva, Vozidlo, JazdaTyp } from '@/lib/types'

export async function batchProcessJazdy(jazdaIds: string[]) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const supabase = createSupabaseAdmin()

  // Load jazdy with stav === 'odoslana' matching IDs
  const { data: jazdy, error: jazdyErr } = await supabase
    .from('jazdy')
    .select('*, vozidlo:vozidla(*), profile:profiles!user_id(id, full_name)')
    .in('id', jazdaIds)
    .eq('stav', 'odoslana')

  if (jazdyErr || !jazdy) return { error: 'Chyba pri načítaní jázd' }

  // Load settings
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .single<Settings>()

  if (!settings) return { error: 'Nastavenia nenájdené' }

  // Load paliva
  const { data: paliva } = await supabase
    .from('paliva')
    .select('*')
    .single<Paliva>()

  if (!paliva) return { error: 'Ceny palív nenájdené' }

  let processed = 0
  let currentDocNumber = settings.last_doc_number

  for (const jazda of jazdy) {
    const vozidlo = jazda.vozidlo as Vozidlo
    if (!vozidlo) continue

    const typ = (jazda.typ || 'firemne_doma') as JazdaTyp

    // Calculate costs
    const result = calculateVyuctovanie(
      typ,
      jazda.km,
      jazda.cas_odchodu,
      jazda.cas_prichodu,
      vozidlo,
      paliva,
      settings,
    )

    // Generate document number
    const cislo_dokladu = generateDocNumber(currentDocNumber)
    currentDocNumber++

    // Update jazda
    await supabase
      .from('jazdy')
      .update({
        stav: 'spracovana',
        cislo_dokladu,
        spotreba_pouzita: result.spotreba_pouzita,
        palivo_typ: result.palivo_typ,
        cena_za_liter: result.cena_za_liter,
        sadzba_za_km: result.sadzba_za_km,
        naklady_phm: result.naklady_phm,
        stravne: result.stravne,
        vreckove: result.vreckove,
        naklady_celkom: result.naklady_celkom,
        skutocna_spotreba_litrov: result.spotreba_litrov,
        spracovane_at: new Date().toISOString(),
      })
      .eq('id', jazda.id)

    // Update last_doc_number in settings
    await supabase
      .from('settings')
      .update({ last_doc_number: currentDocNumber })
      .eq('id', settings.id)

    // If linked to sluzobna_cesta, update skutocne_km
    if (jazda.sluzobna_cesta_id) {
      await supabase
        .from('sluzobne_cesty')
        .update({ skutocne_km: jazda.km })
        .eq('id', jazda.sluzobna_cesta_id)
    }

    // Notify employee
    await createNotifikacia(
      jazda.user_id,
      'jazda_spracovana',
      'Jazda spracovaná',
      `Vaša jazda ${cislo_dokladu} bola spracovaná.`,
      `/moje-jazdy/${jazda.id}`,
    )

    // Audit log
    await logAudit('spracovanie_jazdy', 'jazdy', jazda.id, {
      cislo_dokladu,
      naklady_celkom: result.naklady_celkom,
    })

    processed++
  }

  revalidatePath('/admin/jazdy')
  revalidatePath('/moje-jazdy')
  return { processed }
}

export async function batchRejectJazdy(jazdaIds: string[], dovod: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const supabase = createSupabaseAdmin()

  const { data: jazdy, error: jazdyErr } = await supabase
    .from('jazdy')
    .select('id, user_id, mesiac')
    .in('id', jazdaIds)
    .eq('stav', 'odoslana')

  if (jazdyErr || !jazdy) return { error: 'Chyba pri načítaní jázd' }

  let rejected = 0

  for (const jazda of jazdy) {
    await supabase
      .from('jazdy')
      .update({
        stav: 'rozpracovana',
        komentar: dovod,
      })
      .eq('id', jazda.id)

    await createNotifikacia(
      jazda.user_id,
      'jazda_vratena',
      'Jazda vrátená na doplnenie',
      `Vaša jazda za mesiac ${jazda.mesiac} bola vrátená. Dôvod: ${dovod}`,
      `/moje-jazdy/${jazda.id}`,
    )

    await logAudit('vratenie_jazdy', 'jazdy', jazda.id, { dovod })

    rejected++
  }

  revalidatePath('/admin/jazdy')
  revalidatePath('/moje-jazdy')
  return { rejected }
}
