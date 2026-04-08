'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getZnamky(vozidloId: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('dialnicne_znamky')
    .select('*')
    .eq('vozidlo_id', vozidloId)
    .order('platnost_do', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní známok' }
  return { data }
}

export async function createZnamka(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('dialnicne_znamky').insert({
    vozidlo_id: formData.get('vozidlo_id') as string,
    krajina: formData.get('krajina') as string,
    platnost_od: formData.get('platnost_od') as string,
    platnost_do: formData.get('platnost_do') as string,
    cislo: formData.get('cislo') as string || null,
  })
  if (error) return { error: 'Chyba pri vytváraní známky' }
  revalidatePath('/fleet/vozidla')
  revalidatePath('/moje-vozidlo')
}

export async function deleteZnamka(id: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('dialnicne_znamky').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní známky' }
  revalidatePath('/fleet/vozidla')
  revalidatePath('/moje-vozidlo')
}
