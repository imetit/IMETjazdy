'use server'

import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRole, requireScopedAdmin } from '@/lib/auth-helpers'
import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { ModulId, PristupTyp } from '@/lib/types'
import { logAudit } from './audit'

export async function getUserModuly(userId: string) {
  // Vlastné moduly môže čítať každý prihlásený user; cudzie iba scoped admin.
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [] }
  if (user.id !== userId) {
    const auth = await requireScopedAdmin(userId)
    if ('error' in auth) return { data: [] }
  }
  const admin = createSupabaseAdmin()
  const { data } = await admin
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

  // Use admin client to bypass RLS on user_moduly
  const adminClient = createSupabaseAdmin()

  if (pristup === null) {
    await adminClient.from('user_moduly').delete().eq('user_id', userId).eq('modul', modul)
  } else {
    await adminClient.from('user_moduly').upsert({
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

  const adminClient = createSupabaseAdmin()
  await adminClient.from('profiles').update({ pozicia }).eq('id', userId)
  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/admin/zamestnanci')
}
