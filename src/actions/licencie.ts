'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireScopedAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

export async function getLicencie(userId: string) {
  // RLS na zamestnanec_licencie obmedzí výsledok, ale defense-in-depth:
  // požadujeme scoped admin alebo že user číta vlastné licencie.
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }
  if (user.id !== userId) {
    const auth = await requireScopedAdmin(userId)
    if ('error' in auth) return { error: auth.error }
  }

  const { data, error } = await supabase
    .from('zamestnanec_licencie')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní licencií' }
  return { data }
}

export async function createLicencia(formData: FormData) {
  const userId = formData.get('user_id') as string
  if (!userId) return { error: 'user_id chýba' }

  // Zabraňuje IDOR — caller nesmie posielať ľubovoľný cudzí user_id.
  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('zamestnanec_licencie').insert({
    user_id: userId,
    nazov: formData.get('nazov') as string,
    typ: formData.get('typ') as string || null,
    kluc: formData.get('kluc') as string || null,
    platnost_od: formData.get('platnost_od') as string || null,
    platnost_do: formData.get('platnost_do') as string || null,
    cena: formData.get('cena') ? parseFloat(formData.get('cena') as string) : null,
    poznamka: formData.get('poznamka') as string || null,
  })

  if (error) return { error: 'Chyba pri vytváraní licencie' }
  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/moja-karta')
}

export async function updateLicencia(id: string, formData: FormData) {
  const userId = formData.get('user_id') as string
  if (!userId) return { error: 'user_id chýba' }

  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('zamestnanec_licencie').update({
    nazov: formData.get('nazov') as string,
    typ: formData.get('typ') as string || null,
    kluc: formData.get('kluc') as string || null,
    platnost_od: formData.get('platnost_od') as string || null,
    platnost_do: formData.get('platnost_do') as string || null,
    cena: formData.get('cena') ? parseFloat(formData.get('cena') as string) : null,
    poznamka: formData.get('poznamka') as string || null,
  }).eq('id', id)

  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/moja-karta')
}

export async function deleteLicencia(id: string, userId: string) {
  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('zamestnanec_licencie').delete().eq('id', id)

  if (error) return { error: 'Chyba pri mazaní' }
  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/moja-karta')
}
