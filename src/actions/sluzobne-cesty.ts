// src/actions/sluzobne-cesty.ts
'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getMyCesty() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  const { data, error } = await supabase
    .from('sluzobne_cesty')
    .select('*, schvalovatel:profiles!schvalovatel_id(full_name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní' }
  return { data }
}

export async function createCesta(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nadriadeny_id')
    .eq('id', user.id)
    .single()

  const { error } = await supabase.from('sluzobne_cesty').insert({
    user_id: user.id,
    datum_od: formData.get('datum_od') as string,
    datum_do: formData.get('datum_do') as string,
    ciel: formData.get('ciel') as string,
    ucel: formData.get('ucel') as string,
    doprava: formData.get('doprava') as string,
    predpokladany_km: formData.get('predpokladany_km') ? parseInt(formData.get('predpokladany_km') as string) : null,
    poznamka: formData.get('poznamka') as string || null,
    schvalovatel_id: profile?.nadriadeny_id || null,
  })

  if (error) return { error: 'Chyba pri vytváraní žiadosti' }
  revalidatePath('/sluzobna-cesta')
}

export async function updateSkutocneKm(cestaId: string, km: number) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('sluzobne_cesty').update({
    skutocny_km: km,
  }).eq('id', cestaId)

  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath('/sluzobna-cesta')
}

export async function getAllCesty(filter?: { stav?: string }) {
  const supabase = await createSupabaseServer()
  let query = supabase
    .from('sluzobne_cesty')
    .select('*, profile:profiles!user_id(full_name), schvalovatel:profiles!schvalovatel_id(full_name)')
    .order('created_at', { ascending: false })

  if (filter?.stav) query = query.eq('stav', filter.stav)

  const { data, error } = await query
  if (error) return { error: 'Chyba pri načítaní' }
  return { data }
}

export async function getCestaDetail(id: string) {
  const supabase = await createSupabaseServer()

  const { data: cesta } = await supabase
    .from('sluzobne_cesty')
    .select('*, profile:profiles!user_id(full_name, email), schvalovatel:profiles!schvalovatel_id(full_name)')
    .eq('id', id)
    .single()

  const { data: prikaz } = await supabase
    .from('cestovne_prikazy')
    .select('*')
    .eq('sluzobna_cesta_id', id)
    .single()

  return { cesta, prikaz }
}

export async function schvalCestu(id: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('sluzobne_cesty').update({
    stav: 'schvalena',
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri schvaľovaní' }
  revalidatePath('/admin/sluzobne-cesty')
}

export async function zamietniCestu(id: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('sluzobne_cesty').update({
    stav: 'zamietnuta',
    schvalene_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: 'Chyba pri zamietnutí' }
  revalidatePath('/admin/sluzobne-cesty')
}

export async function ukoncCestu(id: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('sluzobne_cesty').update({
    stav: 'ukoncena',
  }).eq('id', id)

  if (error) return { error: 'Chyba' }
  revalidatePath('/admin/sluzobne-cesty')
  revalidatePath(`/admin/sluzobne-cesty/${id}`)
}
