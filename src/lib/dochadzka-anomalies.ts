import 'server-only'
import type { AnomalyType } from './dochadzka-types'
import { isPracovnyDen, isSviatok } from './dochadzka-utils'
import { createSupabaseAdmin } from './supabase-admin'

interface ZaznamRow { id: string; datum: string; smer: string; dovod: string; cas: string; auto_doplnene: boolean }

export async function detectAnomalies(userId: string, mesiac: string): Promise<AnomalyType[]> {
  const admin = createSupabaseAdmin()
  const [rok, m] = mesiac.split('-').map(Number)
  const result: AnomalyType[] = []

  const { data: zaznamy } = await admin
    .from('dochadzka')
    .select('id, datum, smer, dovod, cas, auto_doplnene')
    .eq('user_id', userId)
    .gte('datum', `${mesiac}-01`)
    .lte('datum', `${mesiac}-31`)
    .order('cas', { ascending: true })
    .returns<ZaznamRow[]>()

  const byDatum = new Map<string, ZaznamRow[]>()
  for (const z of zaznamy || []) {
    if (!byDatum.has(z.datum)) byDatum.set(z.datum, [])
    byDatum.get(z.datum)!.push(z)
  }

  // Načítaj absencie raz (dovolenky, cesty)
  const { data: absencie } = await admin
    .from('dovolenky')
    .select('datum_od, datum_do')
    .eq('user_id', userId)
    .eq('stav', 'schvalena')
    .or(`datum_od.lte.${mesiac}-31,datum_do.gte.${mesiac}-01`)

  function maAbsencu(datum: string): boolean {
    return (absencie || []).some(a => datum >= a.datum_od && datum <= a.datum_do)
  }

  const daysInMonth = new Date(rok, m, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(rok, m - 1, d)
    const datum = dt.toISOString().split('T')[0]
    const records = byDatum.get(datum) || []

    if (!isPracovnyDen(dt)) {
      // Sviatok / víkend — kontroluj len praca v sviatok
      if (isSviatok(dt) && records.some(r => r.dovod === 'praca')) {
        result.push({
          typ: 'praca_vo_sviatok',
          severita: 'low',
          datum,
          popis: 'Práca v štátny sviatok',
        })
      }
      continue
    }

    if (records.length === 0) {
      if (!maAbsencu(datum)) {
        result.push({ typ: 'neuplny_mesiac', severita: 'high', datum, popis: 'Chýbajúce záznamy v pracovný deň' })
      }
      continue
    }

    // Auto-doplnené
    const auto = records.find(r => r.auto_doplnene)
    if (auto) {
      result.push({ typ: 'auto_doplnene', severita: 'medium', datum, popis: 'Auto-doplnený odchod (kontrola)', zaznam_id: auto.id })
    }

    // Chyba odchod (príchod bez odchodu)
    const last = records[records.length - 1]
    if (last.smer === 'prichod') {
      result.push({ typ: 'chyba_odchod', severita: 'high', datum, popis: 'Príchod bez odchodu', zaznam_id: last.id })
    }

    // Podozrivý čas
    for (const r of records) {
      const h = new Date(r.cas).getHours()
      if (h < 6 || h > 22) {
        result.push({ typ: 'podozrivy_cas', severita: 'low', datum, popis: `Záznam o ${String(h).padStart(2, '0')}:xx`, zaznam_id: r.id })
      }
    }

    // Dlhý blok
    if (records.length >= 2) {
      const first = new Date(records[0].cas).getTime()
      const lastT = new Date(records[records.length - 1].cas).getTime()
      const hours = (lastT - first) / 3600000
      if (hours > 16) {
        result.push({ typ: 'dlhy_blok', severita: 'high', datum, popis: `${hours.toFixed(1)}h bez prerušenia` })
      }
    }

    // Duplicitný (2× rovnaký smer za sebou)
    for (let i = 1; i < records.length; i++) {
      if (records[i].smer === records[i - 1].smer) {
        result.push({ typ: 'duplicitny', severita: 'medium', datum, popis: `2× ${records[i].smer} za sebou`, zaznam_id: records[i].id })
        break
      }
    }

    // Kolízia s dovolenkou
    if (maAbsencu(datum) && records.some(r => r.dovod !== 'dovolenka')) {
      result.push({ typ: 'kolizia_dovolenka', severita: 'high', datum, popis: 'Záznam práce počas schválenej dovolenky' })
    }
  }

  return result
}
