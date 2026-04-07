'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateSadzby(data: Record<string, number>) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('settings').update(data).not('id', 'is', null)
  if (error) return { error: 'Chyba pri ukladaní' }
  revalidatePath('/admin/sadzby')
}

export async function updateNastavenia(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('settings').update({ company_name: formData.get('company_name') as string }).not('id', 'is', null)
  if (error) return { error: 'Chyba pri ukladaní' }
  revalidatePath('/admin/nastavenia')
}
