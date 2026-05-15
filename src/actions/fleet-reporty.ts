'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireFleetOrAdmin } from '@/lib/auth-helpers'

export interface VehicleCostRow {
  vozidlo_id: string
  vozidlo_label: string
  spz: string
  servisy_eur: number
  kontroly_eur: number
  celkom_eur: number
  km: number
  eur_per_km: number
}

export interface DriverKmRow {
  user_id: string
  vodic_meno: string
  vozidlo_spz: string
  pocet_jazd: number
  celkom_km: number
  priemer_km: number
}

export async function getFleetCostReport(): Promise<{ data?: VehicleCostRow[]; error?: string }> {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()

  const { data: vozidla } = await supabase.from('vozidla').select('id, znacka, variant, spz')
  if (!vozidla) return { error: 'Nepodarilo sa načítať vozidlá' }

  const { data: servisy } = await supabase.from('vozidlo_servisy').select('vozidlo_id, cena')
  const { data: kontroly } = await supabase.from('vozidlo_kontroly').select('vozidlo_id, cena')
  const { data: jazdy } = await supabase.from('jazdy').select('vozidlo_id, km')

  const servisMap = new Map<string, number>()
  servisy?.forEach(s => {
    servisMap.set(s.vozidlo_id, (servisMap.get(s.vozidlo_id) || 0) + (s.cena || 0))
  })

  const kontrolyMap = new Map<string, number>()
  kontroly?.forEach(k => {
    kontrolyMap.set(k.vozidlo_id, (kontrolyMap.get(k.vozidlo_id) || 0) + (k.cena || 0))
  })

  const kmMap = new Map<string, number>()
  jazdy?.forEach(j => {
    kmMap.set(j.vozidlo_id, (kmMap.get(j.vozidlo_id) || 0) + (j.km || 0))
  })

  const rows: VehicleCostRow[] = vozidla.map(v => {
    const s = servisMap.get(v.id) || 0
    const k = kontrolyMap.get(v.id) || 0
    const km = kmMap.get(v.id) || 0
    const celkom = s + k
    return {
      vozidlo_id: v.id,
      vozidlo_label: `${v.znacka} ${v.variant} (${v.spz})`,
      spz: v.spz,
      servisy_eur: Math.round(s * 100) / 100,
      kontroly_eur: Math.round(k * 100) / 100,
      celkom_eur: Math.round(celkom * 100) / 100,
      km,
      eur_per_km: km > 0 ? Math.round((celkom / km) * 100) / 100 : 0,
    }
  })

  rows.sort((a, b) => b.celkom_eur - a.celkom_eur)

  return { data: rows }
}

export async function getDriverKmReport(): Promise<{ data?: DriverKmRow[]; error?: string }> {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createSupabaseServer()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, vozidlo_id')
    .eq('active', true)
    .neq('role', 'tablet')

  if (!profiles) return { error: 'Nepodarilo sa načítať vodičov' }

  const { data: vozidla } = await supabase.from('vozidla').select('id, spz')
  const spzMap = new Map<string, string>()
  vozidla?.forEach(v => spzMap.set(v.id, v.spz))

  const { data: jazdy } = await supabase.from('jazdy').select('user_id, km')

  const kmMap = new Map<string, { totalKm: number; count: number }>()
  jazdy?.forEach(j => {
    const entry = kmMap.get(j.user_id) || { totalKm: 0, count: 0 }
    entry.totalKm += j.km || 0
    entry.count += 1
    kmMap.set(j.user_id, entry)
  })

  const rows: DriverKmRow[] = profiles
    .filter(p => kmMap.has(p.id) || p.vozidlo_id)
    .map(p => {
      const stats = kmMap.get(p.id) || { totalKm: 0, count: 0 }
      return {
        user_id: p.id,
        vodic_meno: p.full_name,
        vozidlo_spz: p.vozidlo_id ? (spzMap.get(p.vozidlo_id) || '—') : '—',
        pocet_jazd: stats.count,
        celkom_km: stats.totalKm,
        priemer_km: stats.count > 0 ? Math.round((stats.totalKm / stats.count) * 10) / 10 : 0,
      }
    })

  rows.sort((a, b) => b.celkom_km - a.celkom_km)

  return { data: rows }
}
