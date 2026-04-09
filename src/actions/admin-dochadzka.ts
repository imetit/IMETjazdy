'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { DochadzkaZaznam } from '@/lib/dochadzka-types'

export async function getDochadzkaZamestnancov(mesiac: string) {
  const supabase = await createSupabaseServer()
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
  const supabase = await createSupabaseServer()
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
  const supabase = await createSupabaseServer()
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
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  const { error } = await supabase.from('dochadzka').insert({
    user_id: formData.get('user_id') as string,
    datum: formData.get('datum') as string,
    smer: formData.get('smer') as string,
    dovod: formData.get('dovod') as string,
    cas: formData.get('cas') as string,
    zdroj: 'manual',
  })

  if (error) return { error: 'Chyba pri pridávaní záznamu' }
  const userId = formData.get('user_id') as string
  revalidatePath(`/admin/dochadzka/${userId}`)
}

export async function deleteDochadzkaZaznam(id: string, userId: string) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }
  const { error } = await supabase.from('dochadzka').delete().eq('id', id)
  if (error) return { error: 'Chyba pri mazaní záznamu' }
  revalidatePath(`/admin/dochadzka/${userId}`)
}
