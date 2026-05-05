import 'server-only'
import { createSupabaseAdmin } from './supabase-admin'
import { calculateMesacnyStav, isSviatok, isPracovnyDen } from './dochadzka-utils'
import { calculateFond } from './dochadzka-fond'
import type { MesacnySumar, DochadzkaZaznam } from './dochadzka-types'

interface ZaznamRow extends DochadzkaZaznam { auto_doplnene?: boolean }

/**
 * Pure compute fn — bez auth checku. Volaná z cached-pages.ts cez unstable_cache.
 * Auth check sa robí v action wrapperi pred volaním.
 */
export async function computeMesacneSumary(
  mesiac: string,
  firmaIds: string[] | null,
): Promise<{ data?: MesacnySumar[]; error?: string }> {
  const admin = createSupabaseAdmin()

  let query = admin
    .from('profiles')
    .select('id, full_name, firma_id, pozicia, pracovny_fond_hodiny, fond_per_den, active')
    .eq('active', true)
    .neq('role', 'tablet')

  if (firmaIds) {
    if (firmaIds.length === 0) return { data: [] }
    query = query.in('firma_id', firmaIds)
  }

  const { data: profiles, error } = await query
  if (error) return { error: error.message }

  const userIds = (profiles || []).map(p => p.id)
  if (userIds.length === 0) return { data: [] }

  const [zaznamyRes, dovolenkyRes, schvalenieRes] = await Promise.all([
    admin.from('dochadzka').select('id, user_id, datum, smer, dovod, cas, auto_doplnene')
      .in('user_id', userIds)
      .gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-31`)
      .order('cas', { ascending: true }),
    admin.from('dovolenky').select('user_id, datum_od, datum_do, typ, pol_dna')
      .in('user_id', userIds).eq('stav', 'schvalena')
      .or(`datum_od.lte.${mesiac}-31,datum_do.gte.${mesiac}-01`),
    admin.from('dochadzka_schvalene_hodiny').select('user_id')
      .in('user_id', userIds).eq('mesiac', mesiac),
  ])

  const zaznamyByUser = new Map<string, ZaznamRow[]>()
  for (const z of zaznamyRes.data || []) {
    const arr = zaznamyByUser.get(z.user_id) || []
    arr.push(z as ZaznamRow)
    zaznamyByUser.set(z.user_id, arr)
  }

  const dovolenkyByUser = new Map<string, Array<{ user_id: string; datum_od: string; datum_do: string; typ: string; pol_dna: boolean }>>()
  for (const d of dovolenkyRes.data || []) {
    const arr = dovolenkyByUser.get(d.user_id) || []
    arr.push(d as never)
    dovolenkyByUser.set(d.user_id, arr)
  }

  const schvalene = new Set((schvalenieRes.data || []).map(s => s.user_id))

  const [rok, m] = mesiac.split('-').map(Number)

  let sviatky_dni_global = 0
  const daysInMonth = new Date(rok, m, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(rok, m - 1, d)
    if (dt.getDay() === 0 || dt.getDay() === 6) continue
    if (isSviatok(dt)) sviatky_dni_global++
  }

  const sumary: MesacnySumar[] = []

  for (const p of profiles || []) {
    const zaznamy = zaznamyByUser.get(p.id) || []
    const dovolenky = dovolenkyByUser.get(p.id) || []

    const stav = calculateMesacnyStav(zaznamy, rok, m - 1, p.pracovny_fond_hodiny || 8.5)

    let dovolenka_dni = 0, pn_dni = 0, ocr_dni = 0
    for (const d of dovolenky) {
      const od = new Date(d.datum_od); const do_ = new Date(d.datum_do)
      const cur = new Date(od)
      while (cur <= do_) {
        if (cur.getFullYear() === rok && cur.getMonth() === m - 1) {
          const day = cur.getDay()
          if (day !== 0 && day !== 6) {
            const inc = d.pol_dna ? 0.5 : 1
            if (d.typ === 'dovolenka') dovolenka_dni += inc
            else if (d.typ === 'sick_leave') pn_dni += inc
            else if (d.typ === 'ocr') ocr_dni += inc
          }
        }
        cur.setDate(cur.getDate() + 1)
      }
    }

    const auto_doplnene_count = zaznamy.filter(z => z.auto_doplnene).length

    let ma_anomalie = false
    let nadcas_min = 0

    const byDatum = new Map<string, ZaznamRow[]>()
    for (const z of zaznamy) {
      const arr = byDatum.get(z.datum) || []
      arr.push(z); byDatum.set(z.datum, arr)
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(rok, m - 1, d)
      const datum = dt.toISOString().split('T')[0]
      const recs = byDatum.get(datum) || []

      if (!isPracovnyDen(dt)) continue

      if (recs.length === 0) {
        const hasAbsence = dovolenky.some(dv => datum >= dv.datum_od && datum <= dv.datum_do)
        if (!hasAbsence) ma_anomalie = true
        continue
      }
      if (recs.some(r => r.auto_doplnene)) ma_anomalie = true
      const last = recs[recs.length - 1]
      if (last.smer === 'prichod') ma_anomalie = true

      let pracaMin = 0
      let lastPrichod: Date | null = null
      for (const r of recs) {
        if (r.smer === 'prichod' && r.dovod === 'praca') lastPrichod = new Date(r.cas)
        else if (r.smer === 'odchod' && lastPrichod) {
          pracaMin += (new Date(r.cas).getTime() - lastPrichod.getTime()) / 60000
          lastPrichod = null
        }
      }
      const fondMin = calculateFond({
        pracovny_fond_hodiny: p.pracovny_fond_hodiny ?? 8.5,
        fond_per_den: p.fond_per_den ?? null,
      }, dt) * 60
      if (pracaMin > fondMin) nadcas_min += (pracaMin - fondMin)
    }

    sumary.push({
      user_id: p.id,
      full_name: p.full_name,
      firma_id: p.firma_id,
      pozicia: p.pozicia,
      fond_min: stav.fond_min,
      odpracovane_min: stav.odpracovane_min,
      rozdiel_min: stav.rozdiel_min,
      dovolenka_dni,
      pn_dni,
      ocr_dni,
      sviatky_dni: sviatky_dni_global,
      nadcas_hod: Math.round(nadcas_min / 60 * 100) / 100,
      auto_doplnene_count,
      schvalene: schvalene.has(p.id),
      ma_anomalie,
    })
  }

  return { data: sumary }
}
