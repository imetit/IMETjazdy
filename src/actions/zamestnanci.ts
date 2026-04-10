'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export async function createZamestnanec(formData: FormData) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const email = formData.get('email') as string
  const full_name = formData.get('full_name') as string
  const vozidlo_id = formData.get('vozidlo_id') as string || null
  const password = formData.get('password') as string

  const { data: authData, error: authError } = await auth.supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, role: 'zamestnanec' },
  })
  if (authError) return { error: `Chyba pri vytváraní účtu: ${authError.message}` }
  if (vozidlo_id && authData.user) {
    await auth.supabase.from('profiles').update({ vozidlo_id }).eq('id', authData.user.id)
  }

  await logAudit('vytvorenie_zamestnanca', 'profiles', authData.user?.id, { email, full_name })

  revalidatePath('/admin/zamestnanci')
}

export async function updateZamestnanecVozidlo(profileId: string, vozidloId: string | null) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('profiles').update({ vozidlo_id: vozidloId }).eq('id', profileId)
  if (error) return { error: 'Chyba pri priraďovaní vozidla' }
  revalidatePath('/admin/zamestnanci')
}

export async function toggleZamestnanecActive(profileId: string, active: boolean) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('profiles').update({ active }).eq('id', profileId)
  if (error) return { error: 'Chyba pri zmene stavu' }

  await logAudit(active ? 'aktivacia_zamestnanca' : 'deaktivacia_zamestnanca', 'profiles', profileId)

  revalidatePath('/admin/zamestnanci')
}

export async function updateZamestnanecNadriadeny(profileId: string, nadriadenyId: string | null) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('profiles').update({
    nadriadeny_id: nadriadenyId || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath('/admin/zamestnanci')
}

export async function updateZamestnanecPin(profileId: string, pin: string | null) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('profiles').update({
    pin: pin || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath('/admin/zamestnanci')
}

export async function updateZamestnanecFond(profileId: string, fond: number) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('profiles').update({
    pracovny_fond_hodiny: fond,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath('/admin/zamestnanci')
}
