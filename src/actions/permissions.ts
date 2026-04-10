'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import type { ModulId, PristupTyp } from '@/lib/types'
import { logAudit } from './audit'

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
  const auth = await requireRole(['it_admin'])
  if ('error' in auth) return auth

  if (pristup === null) {
    // Remove access
    await auth.supabase.from('user_moduly').delete().eq('user_id', userId).eq('modul', modul)
  } else {
    // Upsert access
    await auth.supabase.from('user_moduly').upsert({
      user_id: userId,
      modul,
      pristup,
    }, { onConflict: 'user_id,modul' })
  }

  await logAudit('zmena_opravneni', 'user_moduly', userId, { modul, pristup })

  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/admin/zamestnanci')
}

export async function updateUserPozicia(userId: string, pozicia: string) {
  const auth = await requireRole(['it_admin', 'admin'])
  if ('error' in auth) return auth

  await auth.supabase.from('profiles').update({ pozicia }).eq('id', userId)
  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/admin/zamestnanci')
}
