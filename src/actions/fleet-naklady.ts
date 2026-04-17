'use server'

import { requireFleetOrAdmin } from '@/lib/auth-helpers'

export async function getNakladyPerVozidlo(vozidloId: string, rok: number) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const { supabase } = auth
  const odDate = `${rok}-01-01`
  const doDate = `${rok}-12-31`

  const [servisy, tankovanie, kontroly, poistne] = await Promise.all([
    supabase.from('vozidlo_servisy').select('cena').eq('vozidlo_id', vozidloId).gte('datum', odDate).lte('datum', doDate),
    supabase.from('vozidlo_tankovanie').select('celkova_cena').eq('vozidlo_id', vozidloId).gte('datum', odDate).lte('datum', doDate),
    supabase.from('vozidlo_kontroly').select('cena').eq('vozidlo_id', vozidloId).gte('datum_vykonania', odDate).lte('datum_vykonania', doDate),
    supabase.from('poistne_udalosti').select('spoluucast').eq('vozidlo_id', vozidloId).gte('datum', odDate).lte('datum', doDate),
  ])

  return {
    data: {
      servisy: (servisy.data || []).reduce((s, r) => s + Number(r.cena || 0), 0),
      tankovanie: (tankovanie.data || []).reduce((s, r) => s + Number(r.celkova_cena || 0), 0),
      kontroly: (kontroly.data || []).reduce((s, r) => s + Number(r.cena || 0), 0),
      poistne: (poistne.data || []).reduce((s, r) => s + Number(r.spoluucast || 0), 0),
    }
  }
}
