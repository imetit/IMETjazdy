'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireScopedAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

export async function getDovolenkaNarok(userId: string, rok: number) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null }
  // Vlastný nárok môže každý čítať; cudzí iba scoped admin.
  if (user.id !== userId) {
    const auth = await requireScopedAdmin(userId)
    if ('error' in auth) return { data: null }
  }
  const { data } = await supabase
    .from('dovolenky_naroky')
    .select('*')
    .eq('user_id', userId)
    .eq('rok', rok)
    .single()
  return { data }
}

export async function upsertDovolenkaNarok(userId: string, rok: number, narokDni: number, preneseneDni: number) {
  // Nárok nesmie meniť žiadny user pre seba (zvýšenie nároku = privilege escalation).
  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }

  if (rok < 2000 || rok > 2100) return { error: 'Neplatný rok' }
  if (narokDni < 0 || narokDni > 60) return { error: 'Nárok mimo rozsahu (0–60)' }
  if (preneseneDni < 0 || preneseneDni > 60) return { error: 'Prenesené dni mimo rozsahu (0–60)' }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('dovolenky_naroky').upsert({
    user_id: userId,
    rok,
    narok_dni: narokDni,
    prenesene_dni: preneseneDni,
  }, { onConflict: 'user_id,rok' })

  if (error) return { error: 'Chyba pri ukladaní nároku' }
  revalidatePath(`/admin/zamestnanci/${userId}`)
}
