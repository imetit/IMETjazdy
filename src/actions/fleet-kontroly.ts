'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getKontroly(filters?: { vozidloId?: string; typ?: string }) {
  const supabase = await createSupabaseServer()
  let query = supabase
    .from('vozidlo_kontroly')
    .select('*, vozidlo:vozidla(id, znacka, variant, spz)')

  if (filters?.vozidloId) query = query.eq('vozidlo_id', filters.vozidloId)
  if (filters?.typ) query = query.eq('typ', filters.typ)

  const { data, error } = await query.order('platnost_do', { ascending: true })
  if (error) return { error: 'Chyba pri načítaní kontrol' }
  return { data }
}

export async function createKontrola(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('vozidlo_kontroly').insert({
    vozidlo_id: formData.get('vozidlo_id') as string,
    typ: formData.get('typ') as string,
    datum_vykonania: formData.get('datum_vykonania') as string,
    platnost_do: formData.get('platnost_do') as string,
    poznamka: formData.get('poznamka') as string || null,
  })
  if (error) return { error: 'Chyba pri vytváraní kontroly' }
  revalidatePath('/fleet/kontroly')
}

export async function updateKontrola(id: string, formData: FormData) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('vozidlo_kontroly').update({
    typ: formData.get('typ') as string,
    datum_vykonania: formData.get('datum_vykonania') as string,
    platnost_do: formData.get('platnost_do') as string,
    poznamka: formData.get('poznamka') as string || null,
  }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii kontroly' }
  revalidatePath('/fleet/kontroly')
}

export async function deleteKontrola(id: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('vozidlo_kontroly').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní kontroly' }
  revalidatePath('/fleet/kontroly')
}
