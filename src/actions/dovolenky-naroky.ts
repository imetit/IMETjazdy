'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getDovolenkaNarok(userId: string, rok: number) {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from('dovolenky_naroky')
    .select('*')
    .eq('user_id', userId)
    .eq('rok', rok)
    .single()
  return { data }
}

export async function upsertDovolenkaNarok(userId: string, rok: number, narokDni: number, preneseneDni: number) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  const { error } = await supabase.from('dovolenky_naroky').upsert({
    user_id: userId,
    rok,
    narok_dni: narokDni,
    prenesene_dni: preneseneDni,
  }, { onConflict: 'user_id,rok' })

  if (error) return { error: 'Chyba pri ukladaní nároku' }
  revalidatePath(`/admin/zamestnanci/${userId}`)
}
