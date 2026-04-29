import 'server-only'
import type { PriplatkySumar } from './dochadzka-types'
import { isSviatok } from './dochadzka-utils'
import { createSupabaseAdmin } from './supabase-admin'
import { calculateFond } from './dochadzka-fond'

interface ZaznamRow { datum: string; smer: string; dovod: string; cas: string }

/** Vráti ako veľa minút bloku [start, end] sa prekrýva s nočným časom 22:00-06:00. */
function nocnaMinuty(start: Date, end: Date): number {
  let total = 0
  const cursor = new Date(start)
  while (cursor < end) {
    const h = cursor.getHours()
    const m = cursor.getMinutes()
    const isNight = h >= 22 || h < 6
    const stepMin = isNight ? 1 : 1
    cursor.setMinutes(m + stepMin)
    if (isNight) total++
  }
  return total
}

export async function calculatePriplatky(userId: string, mesiac: string): Promise<PriplatkySumar> {
  const admin = createSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('pracovny_fond_hodiny, fond_per_den')
    .eq('id', userId).single<{ pracovny_fond_hodiny: number | null; fond_per_den: Record<string, number> | null }>()

  const { data: zaznamy } = await admin
    .from('dochadzka').select('datum, smer, dovod, cas')
    .eq('user_id', userId)
    .gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-31`)
    .order('cas', { ascending: true })
    .returns<ZaznamRow[]>()

  let nocna_min = 0, sobota_min = 0, nedela_min = 0, sviatok_min = 0, nadcas_min = 0

  const byDatum = new Map<string, ZaznamRow[]>()
  for (const z of zaznamy || []) {
    if (!byDatum.has(z.datum)) byDatum.set(z.datum, [])
    byDatum.get(z.datum)!.push(z)
  }

  for (const [datum, recs] of byDatum.entries()) {
    if (!recs || recs.length < 2) continue
    const dt = new Date(datum + 'T00:00:00')
    const day = dt.getDay()  // 0=ne, 6=so

    // Pair príchod-odchod blocks
    let pracaMin = 0
    let lastPrichod: Date | null = null
    for (const r of recs) {
      if (r.smer === 'prichod' && r.dovod === 'praca') {
        lastPrichod = new Date(r.cas)
      } else if (r.smer === 'odchod' && lastPrichod) {
        const odchod = new Date(r.cas)
        const blok = (odchod.getTime() - lastPrichod.getTime()) / 60000
        pracaMin += blok
        nocna_min += nocnaMinuty(lastPrichod, odchod)
        lastPrichod = null
      }
    }

    if (day === 6) sobota_min += pracaMin
    if (day === 0) nedela_min += pracaMin
    if (isSviatok(dt)) sviatok_min += pracaMin

    const fondMin = calculateFond({
      pracovny_fond_hodiny: profile?.pracovny_fond_hodiny ?? 8.5,
      fond_per_den: profile?.fond_per_den ?? null,
    }, dt) * 60
    if (pracaMin > fondMin) nadcas_min += (pracaMin - fondMin)
  }

  return {
    nocna_hod: Math.round(nocna_min / 60 * 100) / 100,
    sobota_hod: Math.round(sobota_min / 60 * 100) / 100,
    nedela_hod: Math.round(nedela_min / 60 * 100) / 100,
    sviatok_hod: Math.round(sviatok_min / 60 * 100) / 100,
    nadcas_hod: Math.round(nadcas_min / 60 * 100) / 100,
  }
}
