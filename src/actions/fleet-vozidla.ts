'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getVozidla(filters?: { stav?: string; typ?: string; search?: string }) {
  const supabase = await createSupabaseServer()
  let query = supabase.from('vozidla').select('*, priradeny_vodic:profiles!priradeny_vodic_id(id, full_name, email)')

  if (filters?.stav) query = query.eq('stav', filters.stav)
  if (filters?.typ) query = query.eq('typ_vozidla', filters.typ)
  if (filters?.search) {
    query = query.or(`spz.ilike.%${filters.search}%,znacka.ilike.%${filters.search}%,variant.ilike.%${filters.search}%`)
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
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('vozidla').insert({
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
  })
  if (error) return { error: 'Chyba pri vytváraní vozidla' }
  revalidatePath('/fleet/vozidla')
}

export async function updateFleetVozidlo(id: string, formData: FormData) {
  const supabase = await createSupabaseServer()
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
    priradeny_vodic_id: formData.get('priradeny_vodic_id') as string || null,
  }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii vozidla' }
  revalidatePath('/fleet/vozidla')
  revalidatePath(`/fleet/vozidla/${id}`)
}

export async function updateKm(vozidloId: string, km: number, zdroj: 'manualne' | 'jazda' | 'servis') {
  const supabase = await createSupabaseServer()

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
