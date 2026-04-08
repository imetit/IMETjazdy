'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getPoistneUdalosti(filters?: { vozidloId?: string; stav?: string }) {
  const supabase = await createSupabaseServer()
  let query = supabase
    .from('poistne_udalosti')
    .select('*, profile:profiles(id, full_name, email), vozidlo:vozidla(id, znacka, variant, spz, vin)')

  if (filters?.vozidloId) query = query.eq('vozidlo_id', filters.vozidloId)
  if (filters?.stav) query = query.eq('stav', filters.stav)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return { error: 'Chyba pri načítaní poistných udalostí' }
  return { data }
}

export async function createPoistnaUdalost(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizovaný prístup' }

  const { error } = await supabase.from('poistne_udalosti').insert({
    vozidlo_id: formData.get('vozidlo_id') as string,
    user_id: user.id,
    datum: formData.get('datum') as string,
    cas: formData.get('cas') as string || null,
    miesto: formData.get('miesto') as string,
    popis: formData.get('popis') as string,
    skoda_popis: formData.get('skoda_popis') as string || null,
    policajna_sprava: formData.get('policajna_sprava') === 'true',
    svedkovia: formData.get('svedkovia') as string || null,
  })
  if (error) return { error: 'Chyba pri vytváraní poistnej udalosti' }
  revalidatePath('/fleet/vozidla')
  revalidatePath('/moje-vozidlo')
}

export async function updatePoistnaUdalostStav(id: string, stav: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('poistne_udalosti').update({ stav }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii stavu' }
  revalidatePath('/fleet/vozidla')
}
