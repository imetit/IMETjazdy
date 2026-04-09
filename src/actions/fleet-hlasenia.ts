'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getHlasenia(filters?: { stav?: string }) {
  const supabase = await createSupabaseServer()
  let query = supabase
    .from('vozidlo_hlasenia')
    .select('*, profile:profiles(id, full_name, email), vozidlo:vozidla(id, znacka, variant, spz)')

  if (filters?.stav) query = query.eq('stav', filters.stav)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return { error: 'Chyba pri načítaní hlásení' }
  return { data }
}

export async function createHlasenie(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizovaný prístup' }

  const { error } = await supabase.from('vozidlo_hlasenia').insert({
    vozidlo_id: formData.get('vozidlo_id') as string,
    user_id: user.id,
    popis: formData.get('popis') as string,
    priorita: formData.get('priorita') as string || 'normalna',
  })
  if (error) return { error: 'Chyba pri vytváraní hlásenia' }
  revalidatePath('/fleet/hlasenia')
  revalidatePath('/nahlasit-problem')
}

export async function updateHlasenieStav(id: string, stav: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('vozidlo_hlasenia').update({ stav }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii stavu' }
  revalidatePath('/fleet/hlasenia')
}

export async function updateHlasenie(id: string, formData: FormData) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }
  const stav = formData.get('stav') as string
  const { error } = await supabase.from('vozidlo_hlasenia').update({
    stav,
    cena: formData.get('cena') ? parseFloat(formData.get('cena') as string) : null,
    dodavatel: formData.get('dodavatel') as string || null,
    riesenie: formData.get('riesenie') as string || null,
    datum_vyriesenia: stav === 'vyriesene' ? (formData.get('datum_vyriesenia') as string || new Date().toISOString().split('T')[0]) : null,
  }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii hlásenia' }
  revalidatePath('/fleet/hlasenia')
  revalidatePath('/fleet')
}
