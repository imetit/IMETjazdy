'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createZamestnanec(formData: FormData) {
  const supabase = await createSupabaseServer()
  const email = formData.get('email') as string
  const full_name = formData.get('full_name') as string
  const vozidlo_id = formData.get('vozidlo_id') as string || null
  const password = formData.get('password') as string

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, role: 'zamestnanec' },
  })
  if (authError) return { error: `Chyba pri vytváraní účtu: ${authError.message}` }
  if (vozidlo_id && authData.user) {
    await supabase.from('profiles').update({ vozidlo_id }).eq('id', authData.user.id)
  }
  revalidatePath('/admin/zamestnanci')
}

export async function updateZamestnanecVozidlo(profileId: string, vozidloId: string | null) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('profiles').update({ vozidlo_id: vozidloId }).eq('id', profileId)
  if (error) return { error: 'Chyba pri priraďovaní vozidla' }
  revalidatePath('/admin/zamestnanci')
}

export async function toggleZamestnanecActive(profileId: string, active: boolean) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('profiles').update({ active }).eq('id', profileId)
  if (error) return { error: 'Chyba pri zmene stavu' }
  revalidatePath('/admin/zamestnanci')
}

export async function updateZamestnanecNadriadeny(profileId: string, nadriadenyId: string | null) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('profiles').update({
    nadriadeny_id: nadriadenyId || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath('/admin/zamestnanci')
}

export async function updateZamestnanecPin(profileId: string, pin: string | null) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('profiles').update({
    pin: pin || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath('/admin/zamestnanci')
}

export async function updateZamestnanecFond(profileId: string, fond: number) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('profiles').update({
    pracovny_fond_hodiny: fond,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath('/admin/zamestnanci')
}
