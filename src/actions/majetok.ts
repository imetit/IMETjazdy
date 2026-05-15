'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireScopedAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

export async function getMajetok(userId: string) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }
  // Buď user číta vlastný majetok alebo musí byť scoped admin.
  if (user.id !== userId) {
    const auth = await requireScopedAdmin(userId)
    if ('error' in auth) return { error: auth.error }
  }

  const { data, error } = await supabase
    .from('zamestnanec_majetok')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní majetku' }
  return { data }
}

export async function createMajetok(formData: FormData) {
  const userId = formData.get('user_id') as string
  if (!userId) return { error: 'user_id chýba' }

  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('zamestnanec_majetok').insert({
    user_id: userId,
    typ: formData.get('typ') as string,
    nazov: formData.get('nazov') as string,
    seriove_cislo: formData.get('seriove_cislo') as string || null,
    obstaravacia_cena: formData.get('obstaravacia_cena') ? parseFloat(formData.get('obstaravacia_cena') as string) : null,
    datum_pridelenia: formData.get('datum_pridelenia') as string || null,
    stav: formData.get('stav') as string || 'pridelene',
    poznamka: formData.get('poznamka') as string || null,
  })

  if (error) return { error: 'Chyba pri vytváraní záznamu' }
  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/moja-karta')
}

export async function updateMajetok(id: string, formData: FormData) {
  const userId = formData.get('user_id') as string
  if (!userId) return { error: 'user_id chýba' }

  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('zamestnanec_majetok').update({
    typ: formData.get('typ') as string,
    nazov: formData.get('nazov') as string,
    seriove_cislo: formData.get('seriove_cislo') as string || null,
    obstaravacia_cena: formData.get('obstaravacia_cena') ? parseFloat(formData.get('obstaravacia_cena') as string) : null,
    datum_pridelenia: formData.get('datum_pridelenia') as string || null,
    stav: formData.get('stav') as string,
    poznamka: formData.get('poznamka') as string || null,
  }).eq('id', id)

  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/moja-karta')
}

export async function deleteMajetok(id: string, userId: string) {
  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('zamestnanec_majetok').delete().eq('id', id)

  if (error) return { error: 'Chyba pri mazaní' }
  revalidatePath(`/admin/zamestnanci/${userId}`)
  revalidatePath('/moja-karta')
}
