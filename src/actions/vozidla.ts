'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createVozidlo(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('vozidla').insert({
    znacka: formData.get('znacka') as string,
    variant: formData.get('variant') as string || '',
    spz: formData.get('spz') as string,
    druh: formData.get('druh') as string,
    palivo: formData.get('palivo') as string,
    spotreba_tp: parseFloat(formData.get('spotreba_tp') as string),
    objem_motora: parseInt(formData.get('objem_motora') as string) || 0,
  })
  if (error) return { error: 'Chyba pri vytváraní vozidla' }
  revalidatePath('/admin/vozidla')
}

export async function updateVozidlo(id: string, formData: FormData) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }
  const { error } = await supabase.from('vozidla').update({
    znacka: formData.get('znacka') as string,
    variant: formData.get('variant') as string || '',
    spz: formData.get('spz') as string,
    druh: formData.get('druh') as string,
    palivo: formData.get('palivo') as string,
    spotreba_tp: parseFloat(formData.get('spotreba_tp') as string),
    objem_motora: parseInt(formData.get('objem_motora') as string) || 0,
  }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii vozidla' }
  revalidatePath('/admin/vozidla')
}

export async function deleteVozidlo(id: string) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }
  const { error } = await supabase.from('vozidla').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní vozidla' }
  revalidatePath('/admin/vozidla')
}
