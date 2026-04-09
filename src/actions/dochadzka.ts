'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import type { IdentifiedUser, DovodDochadzky, SmerDochadzky, ZdrojDochadzky, DochadzkaZaznam } from '@/lib/dochadzka-types'
import { calculateMesacnyStav } from '@/lib/dochadzka-utils'

export async function identifyByRfid(kodKarty: string): Promise<{ data?: IdentifiedUser; error?: string }> {
  const supabase = await createSupabaseServer()

  const { data: karta } = await supabase
    .from('rfid_karty')
    .select('user_id')
    .eq('kod_karty', kodKarty)
    .eq('aktivna', true)
    .single()

  if (!karta) return { error: 'Karta nenájdená' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, pracovny_fond_hodiny')
    .eq('id', karta.user_id)
    .eq('active', true)
    .single()

  if (!profile) return { error: 'Zamestnanec nenájdený' }

  return {
    data: {
      id: profile.id,
      full_name: profile.full_name,
      pracovny_fond_hodiny: profile.pracovny_fond_hodiny || 8.5,
    }
  }
}

export async function identifyByPin(pin: string): Promise<{ data?: IdentifiedUser; error?: string }> {
  const supabase = await createSupabaseServer()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, pracovny_fond_hodiny')
    .eq('pin', pin)
    .eq('active', true)
    .single()

  if (!profile) return { error: 'Nesprávny PIN' }

  return {
    data: {
      id: profile.id,
      full_name: profile.full_name,
      pracovny_fond_hodiny: profile.pracovny_fond_hodiny || 8.5,
    }
  }
}

export async function getMesacnyStav(userId: string, fondHodiny: number) {
  const supabase = await createSupabaseServer()
  const now = new Date()
  const rok = now.getFullYear()
  const mesiac = now.getMonth()

  const startDate = `${rok}-${String(mesiac + 1).padStart(2, '0')}-01`
  const endDate = `${rok}-${String(mesiac + 1).padStart(2, '0')}-${new Date(rok, mesiac + 1, 0).getDate()}`

  const { data: zaznamy } = await supabase
    .from('dochadzka')
    .select('*')
    .eq('user_id', userId)
    .gte('datum', startDate)
    .lte('datum', endDate)
    .order('cas')

  return calculateMesacnyStav(
    (zaznamy || []) as DochadzkaZaznam[],
    rok,
    mesiac,
    fondHodiny
  )
}

export async function recordDochadzka(
  userId: string,
  smer: SmerDochadzky,
  dovod: DovodDochadzky,
  zdroj: ZdrojDochadzky
) {
  const supabase = await createSupabaseServer()
  const now = new Date()
  const datum = now.toISOString().split('T')[0]

  const { error } = await supabase.from('dochadzka').insert({
    user_id: userId,
    datum,
    smer,
    dovod,
    cas: now.toISOString(),
    zdroj,
  })

  if (error) return { error: 'Chyba pri zápise dochádzky' }
  return { success: true }
}
