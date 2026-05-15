'use server'

import { requireAdmin, requireScopedAdmin } from '@/lib/auth-helpers'
import { DochadzkaManualSchema, parseFormData } from '@/lib/validation/schemas'
import { revalidatePath } from 'next/cache'
import type { DochadzkaZaznam } from '@/lib/dochadzka-types'

export async function getDochadzkaZamestnancov(mesiac: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error, profiles: [], zaznamy: [] as DochadzkaZaznam[] }
  const supabase = auth.supabase

  const [rok, mes] = mesiac.split('-').map(Number)
  const startDate = `${rok}-${String(mes).padStart(2, '0')}-01`
  const endDate = `${rok}-${String(mes).padStart(2, '0')}-${new Date(rok, mes, 0).getDate()}`

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, pracovny_fond_hodiny')
    .eq('active', true)
    .in('role', ['zamestnanec', 'fleet_manager'])
    .order('full_name')

  const { data: zaznamy } = await supabase
    .from('dochadzka')
    .select('*')
    .gte('datum', startDate)
    .lte('datum', endDate)
    .order('cas')

  return { profiles: profiles || [], zaznamy: (zaznamy || []) as DochadzkaZaznam[] }
}

export async function getDnesVPraci() {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error, data: [] }
  const supabase = auth.supabase

  const dnes = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('dochadzka')
    .select('user_id, cas, dovod, smer, profile:profiles!user_id(full_name)')
    .eq('datum', dnes)
    .eq('smer', 'prichod')
    .eq('dovod', 'praca')
    .order('cas', { ascending: false })

  const { data: odchody } = await supabase
    .from('dochadzka')
    .select('user_id')
    .eq('datum', dnes)
    .eq('smer', 'odchod')
    .eq('dovod', 'praca')

  const odisliIds = new Set((odchody || []).map((o: any) => o.user_id))
  const vPraci = (data || []).filter((d: any) => !odisliIds.has(d.user_id))

  return { data: vPraci }
}

export async function getDochadzkaDetail(userId: string, mesiac: string) {
  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error, zaznamy: [] as DochadzkaZaznam[], profile: null }
  const supabase = auth.supabase

  const [rok, mes] = mesiac.split('-').map(Number)
  const startDate = `${rok}-${String(mes).padStart(2, '0')}-01`
  const endDate = `${rok}-${String(mes).padStart(2, '0')}-${new Date(rok, mes, 0).getDate()}`

  const { data: zaznamy } = await supabase
    .from('dochadzka')
    .select('*')
    .eq('user_id', userId)
    .gte('datum', startDate)
    .lte('datum', endDate)
    .order('cas')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, pracovny_fond_hodiny')
    .eq('id', userId)
    .single()

  return { zaznamy: (zaznamy || []) as DochadzkaZaznam[], profile }
}

export async function addManualDochadzka(formData: FormData) {
  // Zod validácia (uuid user_id, date YYYY-MM-DD, enum smer/dovod, ISO datetime)
  const parsed = parseFormData(DochadzkaManualSchema, formData)
  if (!parsed.ok) return { error: parsed.error }
  const d = parsed.data

  const auth = await requireScopedAdmin(d.user_id)
  if ('error' in auth) return { error: auth.error }
  const supabase = auth.supabase

  const { error } = await supabase.from('dochadzka').insert({
    user_id: d.user_id,
    datum: d.datum,
    smer: d.smer,
    dovod: d.dovod,
    cas: d.cas,
    zdroj: 'manual',
  })

  if (error) return { error: 'Chyba pri pridávaní záznamu' }
  revalidatePath(`/admin/dochadzka/${d.user_id}`)
}

export async function deleteDochadzkaZaznam(id: string, userId: string) {
  const auth = await requireScopedAdmin(userId)
  if ('error' in auth) return { error: auth.error }
  const supabase = auth.supabase

  const { error } = await supabase.from('dochadzka').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní záznamu' }
  revalidatePath(`/admin/dochadzka/${userId}`)
}
