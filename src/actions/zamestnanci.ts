'use server'

import { createSupabaseAdmin } from '@/lib/supabase-admin'
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
  const role = formData.get('role') as string || 'zamestnanec'

  const adminClient = createSupabaseAdmin()

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (authError) return { error: `Chyba pri vytváraní účtu: ${authError.message}` }
  if (!authData.user) return { error: 'Účet sa nepodarilo vytvoriť' }

  const updates: Record<string, unknown> = {}
  if (vozidlo_id) updates.vozidlo_id = vozidlo_id
  if (role !== 'zamestnanec') updates.role = role

  if (Object.keys(updates).length > 0) {
    await adminClient.from('profiles').update(updates).eq('id', authData.user.id)
  }

  await logAudit('vytvorenie_zamestnanca', 'profiles', authData.user.id, { email, full_name, role })

  revalidatePath('/admin/zamestnanci')
  return { success: true }
}

export async function deleteZamestnanec(profileId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { data: profile } = await adminClient.from('profiles').select('email, full_name').eq('id', profileId).single()

  const { error } = await adminClient.auth.admin.deleteUser(profileId)
  if (error) return { error: `Chyba pri mazaní účtu: ${error.message}` }

  await logAudit('zmazanie_zamestnanca', 'profiles', profileId, { email: profile?.email, full_name: profile?.full_name })

  revalidatePath('/admin/zamestnanci')
  return { success: true }
}

export async function updateZamestnanecVozidlo(profileId: string, vozidloId: string | null) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({ vozidlo_id: vozidloId }).eq('id', profileId)
  if (error) return { error: 'Chyba pri priraďovaní vozidla' }
  revalidatePath('/admin/zamestnanci')
}

export async function toggleZamestnanecActive(profileId: string, active: boolean) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({ active }).eq('id', profileId)
  if (error) return { error: 'Chyba pri zmene stavu' }

  await logAudit(active ? 'aktivacia_zamestnanca' : 'deaktivacia_zamestnanca', 'profiles', profileId)

  revalidatePath('/admin/zamestnanci')
}

export async function updateZamestnanecNadriadeny(profileId: string, nadriadenyId: string | null) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({
    nadriadeny_id: nadriadenyId || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath('/admin/zamestnanci')
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function updateZamestnanecPin(profileId: string, pin: string | null) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({
    pin: pin || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function updateZamestnanecRole(profileId: string, role: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const validRoles = ['zamestnanec', 'admin', 'fleet_manager', 'it_admin']
  if (!validRoles.includes(role)) return { error: 'Neplatná rola' }

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({ role }).eq('id', profileId)
  if (error) return { error: 'Chyba pri zmene roly' }

  await logAudit('zmena_roly', 'profiles', profileId, { nova_rola: role })

  revalidatePath(`/admin/zamestnanci/${profileId}`)
  revalidatePath('/admin/zamestnanci')
}

export async function updateZamestnanecFond(profileId: string, fond: number) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({
    pracovny_fond_hodiny: fond,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function resetZamestnanecPassword(profileId: string, newPassword: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  if (newPassword.length < 6) return { error: 'Heslo musí mať minimálne 6 znakov' }

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.auth.admin.updateUserById(profileId, { password: newPassword })
  if (error) return { error: `Chyba pri zmene hesla: ${error.message}` }

  await logAudit('reset_hesla', 'profiles', profileId)

  return { success: true }
}
