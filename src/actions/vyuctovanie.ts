'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { calculateVyuctovanie, generateDocNumber } from '@/lib/calculations'
import type { Vozidlo, Paliva, Settings, JazdaTyp } from '@/lib/types'
import { logAudit } from './audit'

export async function processJazda(
  jazdaId: string,
  typ: JazdaTyp,
  skutocnaSpotreba?: number | null,
  skutocnaCena?: number | null,
) {
  // Defense-in-depth: validate inputs
  if (!/^[0-9a-f-]{36}$/i.test(jazdaId)) return { error: 'Neplatné jazda ID' }
  if (!['sukromne_doma', 'sukromne_zahranicie', 'firemne_doma', 'firemne_zahranicie'].includes(typ)) {
    return { error: 'Neplatný typ jazdy' }
  }
  if (skutocnaSpotreba != null && (!Number.isFinite(skutocnaSpotreba) || skutocnaSpotreba < 0 || skutocnaSpotreba > 1000)) {
    return { error: 'Neplatná skutočná spotreba (0–1000 l)' }
  }
  if (skutocnaCena != null && (!Number.isFinite(skutocnaCena) || skutocnaCena < 0 || skutocnaCena > 100000)) {
    return { error: 'Neplatná skutočná cena (0–100 000 €)' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const { data: jazda } = await auth.supabase.from('jazdy').select('*, vozidlo:vozidla(*)').eq('id', jazdaId).single()
  if (!jazda) return { error: 'Jazda nenájdená' }

  const { data: paliva } = await auth.supabase.from('paliva').select('*').single()
  const { data: settings } = await auth.supabase.from('settings').select('*').single()
  if (!paliva || !settings) return { error: 'Chýbajú nastavenia' }

  const result = calculateVyuctovanie(typ, jazda.km, jazda.cas_odchodu, jazda.cas_prichodu, jazda.vozidlo as Vozidlo, paliva as Paliva, settings as Settings)
  const cislo_dokladu = generateDocNumber(settings.last_doc_number)

  const { error: updateError } = await auth.supabase.from('jazdy').update({
    typ, stav: 'spracovana', cislo_dokladu,
    spotreba_pouzita: result.spotreba_pouzita, palivo_typ: result.palivo_typ,
    cena_za_liter: result.cena_za_liter, sadzba_za_km: result.sadzba_za_km,
    stravne: result.stravne, vreckove: result.vreckove,
    naklady_phm: result.naklady_phm, naklady_celkom: result.naklady_celkom,
    skutocna_spotreba_litrov: skutocnaSpotreba || null,
    skutocna_cena_phm: skutocnaCena || null,
    spracovane_at: new Date().toISOString(),
  }).eq('id', jazdaId)

  if (updateError) return { error: 'Chyba pri spracovaní' }

  await auth.supabase.from('settings').update({ last_doc_number: settings.last_doc_number + 1 }).eq('id', settings.id)

  await logAudit('spracovanie_jazdy', 'jazdy', jazdaId, { cislo_dokladu, typ, naklady_celkom: result.naklady_celkom })

  revalidatePath('/admin/jazdy')
  revalidatePath(`/admin/jazdy/${jazdaId}`)
  revalidatePath('/moje-jazdy')
  revalidatePath('/moje')
  return { success: true, cislo_dokladu }
}

export async function returnJazda(jazdaId: string, komentar: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('jazdy').update({
    stav: 'rozpracovana', komentar, typ: null, cislo_dokladu: null,
    spotreba_pouzita: null, cena_za_liter: null, sadzba_za_km: null,
    stravne: null, vreckove: null, naklady_phm: null, naklady_celkom: null,
    skutocna_spotreba_litrov: null, skutocna_cena_phm: null,
    spracovane_at: null,
  }).eq('id', jazdaId)
  if (error) return { error: 'Chyba pri vracaní' }

  await logAudit('vratenie_jazdy', 'jazdy', jazdaId, { komentar })

  revalidatePath('/admin/jazdy')
  revalidatePath(`/admin/jazdy/${jazdaId}`)
  revalidatePath('/moje-jazdy')
  revalidatePath('/')
}

export async function reopenJazda(jazdaId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('jazdy').update({
    stav: 'odoslana',
    spracovane_at: null,
  }).eq('id', jazdaId)
  if (error) return { error: 'Chyba pri otváraní' }
  revalidatePath('/admin/jazdy')
  revalidatePath(`/admin/jazdy/${jazdaId}`)
}
