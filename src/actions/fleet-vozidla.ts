'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireFleetOrAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

/**
 * Sanitize user-supplied search input before splicing into a PostgREST .or()
 * filter string. The .or() syntax treats commas as predicate separators and
 * special chars like ), *, ! as syntax — an attacker could inject extra
 * predicates (e.g. ",popis.ilike.%admin%") to widen the result set or pivot.
 *
 * Keep alphanum + slovak diacritics + space + dash + underscore. Trim to 50.
 */
function sanitizeSearch(s: string): string {
  return s.replace(/[^a-zA-Z0-9 áčďéíĺľňóôŕšťúýžÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ_-]/g, '').slice(0, 50)
}

export async function getVozidla(filters?: { stav?: string; typ?: string; search?: string }) {
  const supabase = await createSupabaseServer()
  let query = supabase.from('vozidla').select('*, priradeny_vodic:profiles!priradeny_vodic_id(id, full_name, email)')

  if (filters?.stav) query = query.eq('stav', filters.stav)
  if (filters?.typ) query = query.eq('typ_vozidla', filters.typ)
  if (filters?.search) {
    const safe = sanitizeSearch(filters.search)
    if (safe) {
      query = query.or(`spz.ilike.%${safe}%,znacka.ilike.%${safe}%,variant.ilike.%${safe}%`)
    }
  }

  const { data, error } = await query.order('znacka')
  if (error) return { error: 'Chyba pri načítaní vozidiel' }
  return { data }
}

export async function getVozidloDetail(id: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('vozidla')
    .select('*, priradeny_vodic:profiles!priradeny_vodic_id(id, full_name, email)')
    .eq('id', id)
    .single()

  if (error) return { error: 'Vozidlo nenájdené' }
  return { data }
}

export async function createFleetVozidlo(formData: FormData) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('vozidla').insert({
    znacka: formData.get('znacka') as string,
    variant: formData.get('variant') as string || '',
    spz: formData.get('spz') as string,
    druh: formData.get('druh') as string,
    palivo: formData.get('palivo') as string,
    spotreba_tp: parseFloat(formData.get('spotreba_tp') as string),
    objem_motora: parseInt(formData.get('objem_motora') as string) || 0,
    vin: formData.get('vin') as string || null,
    rok_vyroby: formData.get('rok_vyroby') ? parseInt(formData.get('rok_vyroby') as string) : null,
    farba: formData.get('farba') as string || null,
    typ_vozidla: formData.get('typ_vozidla') as string || 'osobne',
    stav: formData.get('stav') as string || 'aktivne',
    stredisko: formData.get('stredisko') as string || null,
    aktualne_km: parseInt(formData.get('aktualne_km') as string) || 0,
    priradeny_vodic_id: formData.get('priradeny_vodic_id') as string || null,
    obstaravacia_cena: formData.get('obstaravacia_cena') ? parseFloat(formData.get('obstaravacia_cena') as string) : null,
    leasing_koniec: formData.get('leasing_koniec') as string || null,
  })
  if (error) return { error: 'Chyba pri vytváraní vozidla' }
  revalidatePath('/fleet/vozidla')
}

export async function updateFleetVozidlo(id: string, formData: FormData) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const supabase = auth.supabase
  const novyVodicId = formData.get('priradeny_vodic_id') as string || null

  // Zistíme aktuálneho vodiča pred updateom
  const { data: current } = await supabase
    .from('vozidla')
    .select('priradeny_vodic_id')
    .eq('id', id)
    .single()

  const staryVodicId = current?.priradeny_vodic_id || null

  const { error } = await supabase.from('vozidla').update({
    znacka: formData.get('znacka') as string,
    variant: formData.get('variant') as string || '',
    spz: formData.get('spz') as string,
    druh: formData.get('druh') as string,
    palivo: formData.get('palivo') as string,
    spotreba_tp: parseFloat(formData.get('spotreba_tp') as string),
    objem_motora: parseInt(formData.get('objem_motora') as string) || 0,
    vin: formData.get('vin') as string || null,
    rok_vyroby: formData.get('rok_vyroby') ? parseInt(formData.get('rok_vyroby') as string) : null,
    farba: formData.get('farba') as string || null,
    typ_vozidla: formData.get('typ_vozidla') as string || 'osobne',
    stav: formData.get('stav') as string || 'aktivne',
    stredisko: formData.get('stredisko') as string || null,
    aktualne_km: parseInt(formData.get('aktualne_km') as string) || 0,
    priradeny_vodic_id: novyVodicId,
    obstaravacia_cena: formData.get('obstaravacia_cena') ? parseFloat(formData.get('obstaravacia_cena') as string) : null,
    leasing_koniec: formData.get('leasing_koniec') as string || null,
    datum_pridelenia: novyVodicId !== staryVodicId ? new Date().toISOString().split('T')[0] : undefined,
  }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii vozidla' }

  // Ak sa zmenil vodič, zapísať históriu držiteľov
  if (staryVodicId !== novyVodicId) {
    const today = new Date().toISOString().split('T')[0]

    // Ukončiť záznam starého vodiča
    if (staryVodicId) {
      await supabase
        .from('vozidlo_historia_drzitelov')
        .update({ datum_do: today })
        .eq('vozidlo_id', id)
        .eq('user_id', staryVodicId)
        .is('datum_do', null)
    }

    // Vytvoriť záznam pre nového vodiča
    if (novyVodicId) {
      await supabase
        .from('vozidlo_historia_drzitelov')
        .insert({
          vozidlo_id: id,
          user_id: novyVodicId,
          datum_od: today,
        })
    }

    // Auto-vytvorenie odovzdávacieho protokolu pri zmene vodiča
    const { data: vozidlo } = await supabase
      .from('vozidla')
      .select('aktualne_km')
      .eq('id', id)
      .single()

    await supabase.from('odovzdavacie_protokoly').insert({
      vozidlo_id: id,
      odovzdavajuci_id: staryVodicId,
      preberajuci_id: novyVodicId,
      datum: today,
      km_stav: vozidlo?.aktualne_km || null,
      stav_vozidla: 'Automaticky vytvorený protokol pri zmene držiteľa',
    })

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: null,
      akcia: 'zmena_drzitela',
      tabulka: 'vozidla',
      zaznam_id: id,
      detail: { stary_vodic: staryVodicId, novy_vodic: novyVodicId },
    })
  }

  revalidatePath('/fleet/vozidla')
  revalidatePath(`/fleet/vozidla/${id}`)
}

export async function updateKm(vozidloId: string, km: number, zdroj: 'manualne' | 'jazda' | 'servis') {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const supabase = auth.supabase

  const { error: kmError } = await supabase.from('km_historia').insert({
    vozidlo_id: vozidloId,
    km,
    zdroj,
  })
  if (kmError) return { error: 'Chyba pri zápise km' }

  const { error: updateError } = await supabase
    .from('vozidla')
    .update({ aktualne_km: km })
    .eq('id', vozidloId)
  if (updateError) return { error: 'Chyba pri aktualizácii km' }

  revalidatePath(`/fleet/vozidla/${vozidloId}`)
}

export async function getKmHistoria(vozidloId: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('km_historia')
    .select('*')
    .eq('vozidlo_id', vozidloId)
    .order('datum', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní km histórie' }
  return { data }
}

export async function getVodici() {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('active', true)
    .order('full_name')

  if (error) return { error: 'Chyba pri načítaní vodičov' }
  return { data }
}
