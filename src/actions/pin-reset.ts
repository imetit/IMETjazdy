'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export async function resetPin(userId: string): Promise<{ pin?: string; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createSupabaseAdmin()
  let newPin = generatePin()
  let attempts = 0
  while (attempts < 10) {
    const { data: existing } = await admin.from('profiles').select('id').eq('pin', newPin).maybeSingle()
    if (!existing) break
    newPin = generatePin()
    attempts++
  }
  if (attempts >= 10) return { error: 'Nepodarilo sa vygenerovať unikátny PIN' }

  const { error } = await admin.from('profiles').update({ pin: newPin }).eq('id', userId)
  if (error) return { error: 'Chyba pri uložení PIN-u' }

  await logAudit('pin_reset', 'profiles', userId, { reset_by: auth.user.id })

  await admin.from('notifikacie').insert({
    user_id: userId,
    typ: 'pin_reset',
    nadpis: 'Nový PIN pre dochádzku',
    sprava: `Mzdárka ti vygenerovala nový PIN: ${newPin}. Použi ho pri pípnutí na tablete. Nezdieľaj!`,
    link: '/moja-karta',
  })

  revalidatePath(`/admin/zamestnanci/${userId}`)
  return { pin: newPin }
}
