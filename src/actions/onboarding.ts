'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'
import { createNotifikacia } from './notifikacie'

const DEFAULT_ONBOARDING_ITEMS = [
  { typ: 'bozp', nazov: 'BOZP školenie' },
  { typ: 'majetok', nazov: 'Prevzatie majetku' },
  { typ: 'rfid', nazov: 'RFID karta' },
  { typ: 'pristupy', nazov: 'Prístupy do systémov' },
  { typ: 'skolenie', nazov: 'Vstupné školenie' },
  { typ: 'zmluva', nazov: 'Pracovná zmluva' },
]

const DEFAULT_OFFBOARDING_ITEMS = [
  { typ: 'it', nazov: 'Vrátenie IT vybavenia' },
  { typ: 'rfid', nazov: 'Deaktivácia RFID karty' },
  { typ: 'vozidlo', nazov: 'Odovzdanie vozidla' },
  { typ: 'pristupy', nazov: 'Zrušenie prístupov' },
  { typ: 'dovolenka', nazov: 'Výpočet dovolenky' },
  { typ: 'cestovne', nazov: 'Vyúčtovanie cestovných náhrad' },
]

export async function createDefaultOnboarding(profileId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createSupabaseAdmin()

  const items = DEFAULT_ONBOARDING_ITEMS.map(item => ({
    profile_id: profileId,
    typ: item.typ,
    nazov: item.nazov,
    splnene: false,
  }))

  const { error } = await supabase.from('onboarding_items').insert(items)
  if (error) return { error: 'Chyba pri vytváraní onboarding položiek' }

  await logAudit('onboarding_zahajeny', 'onboarding_items', profileId, { pocet: items.length })
  await createNotifikacia(profileId, 'onboarding', 'Onboarding spustený', 'Váš onboarding bol spustený. Sledujte postup vo vašej karte.', '/moja-karta')

  revalidatePath(`/admin/zamestnanci/${profileId}`)
  return { success: true }
}

export async function getOnboardingItems(profileId: string) {
  const supabase = createSupabaseAdmin()

  const { data, error } = await supabase
    .from('onboarding_items')
    .select('*, splnil:profiles!splnil_id(full_name)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })

  if (error) return { data: [] }
  return { data: data || [] }
}

export async function toggleOnboardingItem(itemId: string, splnene: boolean) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createSupabaseAdmin()

  const updateData: Record<string, any> = {
    splnene,
    splnene_datum: splnene ? new Date().toISOString() : null,
    splnil_id: splnene ? auth.user.id : null,
  }

  const { error } = await supabase
    .from('onboarding_items')
    .update(updateData)
    .eq('id', itemId)

  if (error) return { error: 'Chyba pri aktualizácii' }

  // Get the item to find profile_id for revalidation
  const { data: item } = await supabase
    .from('onboarding_items')
    .select('profile_id')
    .eq('id', itemId)
    .single()

  if (item) revalidatePath(`/admin/zamestnanci/${item.profile_id}`)
  return { success: true }
}

export async function addCustomOnboardingItem(profileId: string, nazov: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createSupabaseAdmin()

  const { error } = await supabase.from('onboarding_items').insert({
    profile_id: profileId,
    typ: 'custom',
    nazov,
    splnene: false,
  })

  if (error) return { error: 'Chyba pri pridávaní položky' }

  revalidatePath(`/admin/zamestnanci/${profileId}`)
  return { success: true }
}

export async function startOffboarding(profileId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createSupabaseAdmin()

  // Set offboarding status
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ offboarding_stav: 'zahajeny' })
    .eq('id', profileId)

  if (profileError) return { error: 'Chyba pri nastavení offboardingu' }

  // Create offboarding checklist items
  const items = DEFAULT_OFFBOARDING_ITEMS.map(item => ({
    profile_id: profileId,
    typ: `offboarding_${item.typ}`,
    nazov: item.nazov,
    splnene: false,
  }))

  const { error } = await supabase.from('onboarding_items').insert(items)
  if (error) return { error: 'Chyba pri vytváraní offboarding položiek' }

  await logAudit('offboarding_zahajeny', 'profiles', profileId, { pocet: items.length })
  await createNotifikacia(profileId, 'offboarding', 'Offboarding spustený', 'Váš offboarding proces bol spustený.', '/moja-karta')

  revalidatePath(`/admin/zamestnanci/${profileId}`)
  return { success: true }
}

export async function completeOffboarding(profileId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createSupabaseAdmin()

  // Check all offboarding items are done
  const { data: items } = await supabase
    .from('onboarding_items')
    .select('splnene')
    .eq('profile_id', profileId)
    .like('typ', 'offboarding_%')

  const allDone = items && items.length > 0 && items.every(i => i.splnene)
  if (!allDone) return { error: 'Nie všetky položky offboardingu sú splnené' }

  const { error } = await supabase
    .from('profiles')
    .update({ offboarding_stav: 'dokonceny', active: false })
    .eq('id', profileId)

  if (error) return { error: 'Chyba pri dokončení offboardingu' }

  await logAudit('offboarding_dokonceny', 'profiles', profileId, {})

  revalidatePath(`/admin/zamestnanci/${profileId}`)
  revalidatePath('/admin/zamestnanci')
  return { success: true }
}
