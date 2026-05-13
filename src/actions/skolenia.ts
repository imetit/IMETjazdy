'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { validateUpload } from '@/lib/upload-validator'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

function calculateStav(platnostDo: string | null): string {
  if (!platnostDo) return 'platne'
  const today = new Date()
  const expiry = new Date(platnostDo)
  const thirtyDays = new Date()
  thirtyDays.setDate(thirtyDays.getDate() + 30)

  if (expiry < today) return 'expirovane'
  if (expiry <= thirtyDays) return 'blizi_sa'
  return 'platne'
}

export async function getSkolenia(profileId: string) {
  const supabase = createSupabaseAdmin()

  const { data, error } = await supabase
    .from('skolenia')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) return { data: [] }

  // Auto-calculate stav
  const enriched = (data || []).map(s => ({
    ...s,
    stav: calculateStav(s.platnost_do),
  }))

  return { data: enriched }
}

export async function createSkolenie(formData: FormData) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createSupabaseAdmin()
  const profileId = formData.get('profile_id') as string

  let certifikatUrl: string | null = null
  const file = formData.get('certifikat') as File | null
  if (file && file.size > 0) {
    const v = validateUpload(file, { category: 'document', maxSizeMb: 10 })
    if (!v.ok) return { error: v.error }
    const fileName = `${profileId}/${v.safePath}`
    const { error: uploadError } = await supabase.storage
      .from('skolenia-certifikaty')
      .upload(fileName, file, { contentType: file.type })

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('skolenia-certifikaty')
        .getPublicUrl(fileName)
      certifikatUrl = urlData.publicUrl
    }
  }

  const { error } = await supabase.from('skolenia').insert({
    profile_id: profileId,
    typ: formData.get('typ') as string,
    nazov: formData.get('nazov') as string,
    datum_absolvovany: formData.get('datum_absolvovany') as string || null,
    platnost_do: formData.get('platnost_do') as string || null,
    certifikat_url: certifikatUrl,
    stav: 'platne',
    poznamka: formData.get('poznamka') as string || null,
  })

  if (error) return { error: 'Chyba pri vytváraní školenia' }

  await logAudit('vytvorenie_skolenia', 'skolenia', profileId, { nazov: formData.get('nazov') })

  revalidatePath(`/admin/zamestnanci/${profileId}`)
  revalidatePath('/moja-karta')
  return { success: true }
}

export async function deleteSkolenie(id: string, profileId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createSupabaseAdmin()
  const { error } = await supabase.from('skolenia').delete().eq('id', id)

  if (error) return { error: 'Chyba pri mazaní školenia' }

  revalidatePath(`/admin/zamestnanci/${profileId}`)
  revalidatePath('/moja-karta')
  return { success: true }
}

export async function getExpiraceSkoleni() {
  const supabase = createSupabaseAdmin()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const { data, error } = await supabase
    .from('skolenia')
    .select('*, profile:profiles!profile_id(full_name, active)')
    .lte('platnost_do', thirtyDaysFromNow.toISOString().split('T')[0])
    .gte('platnost_do', new Date().toISOString().split('T')[0])
    .order('platnost_do')
    .limit(10)

  if (error) return { data: [] }

  // Filter only active employees
  const filtered = (data || []).filter((s: any) => s.profile?.active !== false)

  return { data: filtered }
}
