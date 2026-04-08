'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import type { FleetDashboardData } from '@/lib/fleet-types'

export async function getFleetDashboardData(): Promise<{ data?: FleetDashboardData; error?: string }> {
  const supabase = await createSupabaseServer()

  const { data: vozidla } = await supabase.from('vozidla').select('id, stav, znacka, variant, spz')
  const aktivne = vozidla?.filter(v => v.stav === 'aktivne' || !v.stav).length ?? 0
  const vServise = vozidla?.filter(v => v.stav === 'servis').length ?? 0
  const vyradene = vozidla?.filter(v => v.stav === 'vyradene').length ?? 0

  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const { data: bliziaceSa } = await supabase
    .from('vozidlo_kontroly')
    .select('*, vozidlo:vozidla(id, znacka, variant, spz)')
    .lte('platnost_do', in30)
    .gte('platnost_do', today)
    .order('platnost_do')

  const { count: noveHlasenia } = await supabase
    .from('vozidlo_hlasenia')
    .select('*', { count: 'exact', head: true })
    .eq('stav', 'nove')

  const monthStart = new Date()
  monthStart.setDate(1)
  const { data: mesacneServisy } = await supabase
    .from('vozidlo_servisy')
    .select('cena')
    .gte('datum', monthStart.toISOString().split('T')[0])

  const mesacneNaklady = mesacneServisy?.reduce((sum, s) => sum + (s.cena || 0), 0) ?? 0

  const yearStart = `${new Date().getFullYear()}-01-01`
  const { data: rocneServisy } = await supabase
    .from('vozidlo_servisy')
    .select('cena')
    .gte('datum', yearStart)

  const rocneNaklady = rocneServisy?.reduce((sum, s) => sum + (s.cena || 0), 0) ?? 0

  const { data: allServisy } = await supabase
    .from('vozidlo_servisy')
    .select('vozidlo_id, cena')

  const costMap = new Map<string, number>()
  allServisy?.forEach(s => {
    costMap.set(s.vozidlo_id, (costMap.get(s.vozidlo_id) || 0) + (s.cena || 0))
  })

  const najnakladnejsie = Array.from(costMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([vozidloId, naklady]) => ({
      vozidlo: vozidla?.find(v => v.id === vozidloId) as any,
      naklady,
    }))
    .filter(item => item.vozidlo)

  return {
    data: {
      celkomVozidiel: vozidla?.length ?? 0,
      aktivne,
      vServise,
      vyradene,
      bliziaceSaKontroly: (bliziaceSa as any) ?? [],
      noveHlasenia: noveHlasenia ?? 0,
      mesacneNaklady,
      rocneNaklady,
      najnakladnejsie,
    },
  }
}
