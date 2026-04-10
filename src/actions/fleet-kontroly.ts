'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireFleetOrAdmin } from '@/lib/auth-helpers'
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
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('vozidlo_kontroly').insert({
    vozidlo_id: formData.get('vozidlo_id') as string,
    typ: formData.get('typ') as string,
    datum_vykonania: formData.get('datum_vykonania') as string,
    platnost_do: formData.get('platnost_do') as string,
    cena: formData.get('cena') ? parseFloat(formData.get('cena') as string) : null,
    zaplatene: formData.get('zaplatene') === 'true',
    datum_platby: formData.get('datum_platby') as string || null,
    poznamka: formData.get('poznamka') as string || null,
  })
  if (error) return { error: 'Chyba pri vytváraní kontroly' }
  revalidatePath('/fleet/kontroly')
  revalidatePath('/fleet')
}

export async function updateKontrola(id: string, formData: FormData) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('vozidlo_kontroly').update({
    typ: formData.get('typ') as string,
    datum_vykonania: formData.get('datum_vykonania') as string,
    platnost_do: formData.get('platnost_do') as string,
    cena: formData.get('cena') ? parseFloat(formData.get('cena') as string) : null,
    zaplatene: formData.get('zaplatene') === 'true',
    datum_platby: formData.get('datum_platby') as string || null,
    poznamka: formData.get('poznamka') as string || null,
  }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii kontroly' }
  revalidatePath('/fleet/kontroly')
  revalidatePath('/fleet')
}

export async function toggleZaplatene(id: string, zaplatene: boolean) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('vozidlo_kontroly').update({
    zaplatene,
    datum_platby: zaplatene ? new Date().toISOString().split('T')[0] : null,
  }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii platby' }
  revalidatePath('/fleet/kontroly')
  revalidatePath('/fleet')
}

export async function deleteKontrola(id: string) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('vozidlo_kontroly').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní kontroly' }
  revalidatePath('/fleet/kontroly')
}
