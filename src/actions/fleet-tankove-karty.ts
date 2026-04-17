'use server'

import { requireFleetOrAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export async function getTankoveKarty(filters?: { vozidloId?: string; vodicId?: string; stav?: string }) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error, data: [] }

  const adminClient = createSupabaseAdmin()
  let query = adminClient
    .from('tankove_karty')
    .select('*, vozidlo:vozidla!vozidlo_id(id, spz, znacka), vodic:profiles!vodic_id(id, full_name)')

  if (filters?.vozidloId) query = query.eq('vozidlo_id', filters.vozidloId)
  if (filters?.vodicId) query = query.eq('vodic_id', filters.vodicId)
  if (filters?.stav) query = query.eq('stav', filters.stav)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní tankových kariet', data: [] }
  return { data: data || [] }
}

export async function getAllTankoveKarty() {
  return getTankoveKarty()
}

export async function createTankovaKarta(formData: FormData) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createSupabaseAdmin()

  const vozidloId = (formData.get('vozidlo_id') as string) || null
  const vodicId = (formData.get('vodic_id') as string) || null

  // Validácia: nemôžu byť oba nastavené
  if (vozidloId && vodicId) {
    return { error: 'Karta nemôže byť priradená vozidlu aj vodičovi súčasne' }
  }

  const limitMesacny = formData.get('limit_mesacny') ? parseFloat(formData.get('limit_mesacny') as string) : null

  const { data, error } = await adminClient.from('tankove_karty').insert({
    cislo_karty: formData.get('cislo_karty') as string,
    typ: formData.get('typ') as string,
    vozidlo_id: vozidloId || null,
    vodic_id: vodicId || null,
    stav: (formData.get('stav') as string) || 'aktivna',
    limit_mesacny: limitMesacny,
    platnost_do: (formData.get('platnost_do') as string) || null,
    poznamka: (formData.get('poznamka') as string) || null,
  }).select().single()

  if (error) return { error: 'Chyba pri vytváraní tankovej karty' }

  await logAudit('tankova_karta_vytvorena', 'tankove_karty', data?.id, {
    cislo_karty: formData.get('cislo_karty'),
  })

  revalidatePath('/fleet/tankove-karty')
  return { data }
}

export async function updateTankovaKarta(id: string, updateData: Record<string, any>) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createSupabaseAdmin()

  // Validácia: nemôžu byť oba nastavené
  if (updateData.vozidlo_id && updateData.vodic_id) {
    return { error: 'Karta nemôže byť priradená vozidlu aj vodičovi súčasne' }
  }

  const { error } = await adminClient.from('tankove_karty').update(updateData).eq('id', id)
  if (error) return { error: 'Chyba pri aktualizácii tankovej karty' }

  await logAudit('tankova_karta_aktualizovana', 'tankove_karty', id, updateData)

  revalidatePath('/fleet/tankove-karty')
  return {}
}

export async function deleteTankovaKarta(id: string) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createSupabaseAdmin()

  const { error } = await adminClient.from('tankove_karty').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní tankovej karty' }

  await logAudit('tankova_karta_zmazana', 'tankove_karty', id)

  revalidatePath('/fleet/tankove-karty')
  return {}
}
