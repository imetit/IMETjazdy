'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireScopedAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

export async function getRfidKarty(userId: string) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }
  // Vlastné RFID karty môže čítať každý user; ostatných len scoped admin.
  if (user.id !== userId) {
    const auth = await requireScopedAdmin(userId)
    if ('error' in auth) return { error: auth.error }
  }
  const { data, error } = await supabase
    .from('rfid_karty')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return { error: 'Chyba pri načítaní' }
  return { data }
}

export async function createRfidKarta(userId: string, kodKarty: string) {
  // RFID karta = fyzický prístup do firmy. Iba scoped admin smie priraďovať.
  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('rfid_karty').insert({
    user_id: userId,
    kod_karty: kodKarty,
  })
  if (error) {
    if (error.code === '23505') return { error: 'Táto karta je už priradená' }
    return { error: 'Chyba pri pridávaní karty' }
  }
  revalidatePath(`/admin/zamestnanci/${userId}`)
}

export async function toggleRfidKarta(id: string, aktivna: boolean, userId: string) {
  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('rfid_karty').update({ aktivna }).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath(`/admin/zamestnanci/${userId}`)
}

export async function deleteRfidKarta(id: string, userId: string) {
  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('rfid_karty').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní' }
  revalidatePath(`/admin/zamestnanci/${userId}`)
}
