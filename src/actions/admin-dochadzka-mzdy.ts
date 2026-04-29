'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getAccessibleFirmaIds } from '@/lib/firma-scope'
import { calculateMesacnyStav, isSviatok } from '@/lib/dochadzka-utils'
import { calculateFond } from '@/lib/dochadzka-fond'
import { detectAnomalies } from '@/lib/dochadzka-anomalies'
import { calculatePriplatky } from '@/lib/dochadzka-priplatky'
import type { MesacnySumar, DochadzkaZaznam } from '@/lib/dochadzka-types'

/**
 * Vráti mesačné súhrny pre všetkých zamestnancov ku ktorým má mzdárka prístup.
 */
export async function getMesacneSumary(mesiac: string, firmaIds?: string[]): Promise<{ data?: MesacnySumar[]; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const accessible = await getAccessibleFirmaIds(auth.user.id)
  const admin = createSupabaseAdmin()

  // Apply firma filter
  let query = admin
    .from('profiles')
    .select('id, full_name, firma_id, pozicia, pracovny_fond_hodiny, fond_per_den, active')
    .eq('active', true)
    .neq('role', 'tablet')

  // accessible === null → it_admin → vidí všetky
  if (accessible !== null) {
    if (accessible.length === 0) return { data: [] }
    query = query.in('firma_id', accessible)
  }
  // Filter používateľa ak vybral konkrétne firmy
  if (firmaIds && firmaIds.length > 0) {
    query = query.in('firma_id', firmaIds)
  }

  const { data: profiles, error } = await query
  if (error) return { error: error.message }

  // Nacitaj záznamy + dovolenky + schválenia paralelne
  const userIds = (profiles || []).map(p => p.id)
  if (userIds.length === 0) return { data: [] }

  const [zaznamyRes, dovolenkyRes, schvalenieRes] = await Promise.all([
    admin.from('dochadzka').select('user_id, datum, smer, dovod, cas, auto_doplnene')
      .in('user_id', userIds)
      .gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-31`),
    admin.from('dovolenky').select('user_id, datum_od, datum_do, typ, pol_dna')
      .in('user_id', userIds).eq('stav', 'schvalena')
      .or(`datum_od.lte.${mesiac}-31,datum_do.gte.${mesiac}-01`),
    admin.from('dochadzka_schvalene_hodiny').select('user_id')
      .in('user_id', userIds).eq('mesiac', mesiac),
  ])

  const zaznamyByUser = new Map<string, DochadzkaZaznam[]>()
  for (const z of zaznamyRes.data || []) {
    const arr = zaznamyByUser.get(z.user_id) || []
    arr.push(z as DochadzkaZaznam)
    zaznamyByUser.set(z.user_id, arr)
  }

  const dovolenkyByUser = new Map<string, typeof dovolenkyRes.data>()
  for (const d of dovolenkyRes.data || []) {
    const arr = dovolenkyByUser.get(d.user_id) || []
    arr.push(d)
    dovolenkyByUser.set(d.user_id, arr as never)
  }

  const schvalene = new Set((schvalenieRes.data || []).map(s => s.user_id))

  const [rok, m] = mesiac.split('-').map(Number)
  const sumary: MesacnySumar[] = []

  for (const p of profiles || []) {
    const zaznamy = zaznamyByUser.get(p.id) || []
    const dovolenky = dovolenkyByUser.get(p.id) || []

    // Mesačný stav (odpracované, fond)
    const stav = calculateMesacnyStav(zaznamy, rok, m - 1, p.pracovny_fond_hodiny || 8.5)

    // Spočítaj dovolenky/PN/OČR/sviatky DNI v tomto mesiaci
    let dovolenka_dni = 0, pn_dni = 0, ocr_dni = 0
    for (const d of dovolenky) {
      const od = new Date(d.datum_od)
      const do_ = new Date(d.datum_do)
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

    // Sviatky pracovné dni v mesiaci
    let sviatky_dni = 0
    const daysInMonth = new Date(rok, m, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(rok, m - 1, d)
      const isPracDen = dt.getDay() !== 0 && dt.getDay() !== 6
      if (!isPracDen) continue
      if (isSviatok(dt)) sviatky_dni++
    }

    const auto_doplnene_count = zaznamy.filter(z => z.auto_doplnene).length

    // Anomálie len rýchlo — má/nemá
    const anomalie = await detectAnomalies(p.id, mesiac)
    const ma_anomalie = anomalie.length > 0

    // Príplatky (nadčas)
    const priplatky = await calculatePriplatky(p.id, mesiac)

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
      sviatky_dni,
      nadcas_hod: priplatky.nadcas_hod,
      auto_doplnene_count,
      schvalene: schvalene.has(p.id),
      ma_anomalie,
    })
  }

  return { data: sumary }
}

/**
 * Detail jedného zamestnanca pre mesiac.
 */
export async function getZamestnanecDetail(userId: string, mesiac: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createSupabaseAdmin()
  const [profileRes, zaznamyRes, ziadostiRes, schvalenieRes] = await Promise.all([
    admin.from('profiles').select('*, firma:firma_id(kod, nazov)').eq('id', userId).single(),
    admin.from('dochadzka').select('*')
      .eq('user_id', userId)
      .gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-31`)
      .order('cas', { ascending: true }),
    admin.from('dochadzka_korekcia_ziadosti').select('*')
      .eq('user_id', userId)
      .gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-31`)
      .order('created_at', { ascending: false }),
    admin.from('dochadzka_schvalene_hodiny').select('*')
      .eq('user_id', userId).eq('mesiac', mesiac).maybeSingle(),
  ])

  const anomalie = await detectAnomalies(userId, mesiac)
  const priplatky = await calculatePriplatky(userId, mesiac)

  return {
    profile: profileRes.data,
    zaznamy: zaznamyRes.data || [],
    ziadosti: ziadostiRes.data || [],
    schvalenie: schvalenieRes.data,
    anomalie,
    priplatky,
  }
}

/** Aktívni zamestnanci v práci práve teraz (príchod bez odchodu dnes). */
export async function getVPraciDnes() {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: [] }

  const admin = createSupabaseAdmin()
  const accessible = await getAccessibleFirmaIds(auth.user.id)
  const today = new Date().toISOString().split('T')[0]

  let query = admin.from('profiles').select('id, full_name, firma_id').eq('active', true).neq('role', 'tablet')
  if (accessible !== null) {
    if (accessible.length === 0) return { data: [] }
    query = query.in('firma_id', accessible)
  }
  const { data: profiles } = await query
  if (!profiles) return { data: [] }

  const result: Array<{ id: string; full_name: string; prichod_cas: string }> = []
  for (const p of profiles) {
    const { data: recs } = await admin.from('dochadzka')
      .select('smer, dovod, cas').eq('user_id', p.id).eq('datum', today).order('cas', { ascending: true })
    if (!recs || recs.length === 0) continue
    const last = recs[recs.length - 1]
    if (last.smer === 'prichod') {
      result.push({ id: p.id, full_name: p.full_name, prichod_cas: last.cas })
    }
  }
  return { data: result }
}
