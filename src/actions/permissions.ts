'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { ModulId, PristupTyp } from '@/lib/types'

export async function getUserModuly(userId: string) {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from('user_moduly')
    .select('*')
    .eq('user_id', userId)

  return { data: data || [] }
}

export async function getMyModuly() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [] }

  // it_admin vidí všetko
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'it_admin') {
    return {
      data: [
        'jazdy', 'vozovy_park', 'zamestnanecka_karta', 'dochadzka',
        'dovolenky', 'sluzobne_cesty', 'archiv', 'admin_zamestnanci', 'admin_nastavenia'
      ].map(m => ({ modul: m, pristup: 'admin' }))
    }
  }

  const { data } = await supabase
    .from('user_moduly')
    .select('modul, pristup')
    .eq('user_id', user.id)

  return { data: data || [] }
}

export async function setUserModul(userId: string, modul: ModulId, pristup: PristupTyp | null) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  if (pristup === null) {
    // Remove access
    await supabase.from('user_moduly').delete().eq('user_id', userId).eq('modul', modul)
  } else {
    // Upsert access
    await supabase.from('user_moduly').upsert({
      user_id: userId,
      modul,
      pristup,
    }, { onConflict: 'user_id,modul' })
  }

  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/admin/zamestnanci')
}

export async function updateUserPozicia(userId: string, pozicia: string) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  await supabase.from('profiles').update({ pozicia }).eq('id', userId)
  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/admin/zamestnanci')
}
