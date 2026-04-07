'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updatePalivo(key: string, value: number) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('paliva').update({ [key]: value, aktualizovane: new Date().toISOString() }).not('id', 'is', null)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath('/admin/paliva')
}
