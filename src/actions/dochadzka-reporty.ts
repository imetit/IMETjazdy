// src/actions/dochadzka-reporty.ts
'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import type { DochadzkaZaznam } from '@/lib/dochadzka-types'
import { calculateDenneOdpracovane, getMesacnyFond, isPracovnyDen } from '@/lib/dochadzka-utils'

interface ZamestnanecReport {
  id: string
  full_name: string
  pracovny_fond_hodiny: number
  odpracovane_min: number
  fond_min: number
  rozdiel_min: number
  fajcenie_min: number
  dni_dochadzka: number
}

interface DennyDetail {
  datum: string
  prichod: string | null
  odchod: string | null
  odpracovane_min: number
  fajcenie_min: number
  dovody: string[]
  typ_dna: 'pracovny' | 'vikend' | 'sviatok' | 'dovolenka'
}

export async function getReportData(mesiac: string) {
  const supabase = await createSupabaseServer()
  const [rok, mes] = mesiac.split('-').map(Number)
  const startDate = `${rok}-${String(mes).padStart(2, '0')}-01`
  const daysInMonth = new Date(rok, mes, 0).getDate()
  const endDate = `${rok}-${String(mes).padStart(2, '0')}-${daysInMonth}`

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

  const allZaznamy = (zaznamy || []) as DochadzkaZaznam[]
  const result: ZamestnanecReport[] = []

  for (const p of profiles || []) {
    const userZaznamy = allZaznamy.filter(z => z.user_id === p.id)
    const fondHodiny = p.pracovny_fond_hodiny || 8.5
    const fondMin = getMesacnyFond(rok, mes - 1, fondHodiny)

    // Group by day
    const dny = new Map<string, DochadzkaZaznam[]>()
    for (const z of userZaznamy) {
      if (!dny.has(z.datum)) dny.set(z.datum, [])
      dny.get(z.datum)!.push(z)
    }

    let odpracovaneMin = 0
    let fajcenieMin = 0
    let dniDochadzka = 0

    for (const [, denneZaznamy] of dny) {
      const odpr = calculateDenneOdpracovane(denneZaznamy)
      odpracovaneMin += odpr
      if (odpr > 0) dniDochadzka++

      // Smoking breaks
      const sorted = [...denneZaznamy].sort((a, b) => new Date(a.cas).getTime() - new Date(b.cas).getTime())
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].smer === 'odchod' && sorted[i].dovod === 'fajcenie') {
          const next = sorted.slice(i + 1).find(n => n.smer === 'prichod')
          if (next) {
            fajcenieMin += (new Date(next.cas).getTime() - new Date(sorted[i].cas).getTime()) / 60000
          }
        }
      }
    }

    result.push({
      id: p.id,
      full_name: p.full_name,
      pracovny_fond_hodiny: fondHodiny,
      odpracovane_min: odpracovaneMin,
      fond_min: fondMin,
      rozdiel_min: odpracovaneMin - fondMin,
      fajcenie_min: Math.round(fajcenieMin),
      dni_dochadzka: dniDochadzka,
    })
  }

  return { data: result }
}

export async function getDetailReport(userId: string, mesiac: string) {
  const supabase = await createSupabaseServer()
  const [rok, mes] = mesiac.split('-').map(Number)
  const startDate = `${rok}-${String(mes).padStart(2, '0')}-01`
  const daysInMonth = new Date(rok, mes, 0).getDate()
  const endDate = `${rok}-${String(mes).padStart(2, '0')}-${daysInMonth}`

  const { data: zaznamy } = await supabase
    .from('dochadzka')
    .select('*')
    .eq('user_id', userId)
    .gte('datum', startDate)
    .lte('datum', endDate)
    .order('cas')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, pracovny_fond_hodiny')
    .eq('id', userId)
    .single()

  const allZaznamy = (zaznamy || []) as DochadzkaZaznam[]
  const dny = new Map<string, DochadzkaZaznam[]>()
  for (const z of allZaznamy) {
    if (!dny.has(z.datum)) dny.set(z.datum, [])
    dny.get(z.datum)!.push(z)
  }

  const denneDetaily: DennyDetail[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${rok}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dateObj = new Date(rok, mes - 1, d)
    const denneZaznamy = dny.get(dateStr) || []
    const sorted = [...denneZaznamy].sort((a, b) => new Date(a.cas).getTime() - new Date(b.cas).getTime())

    const prichody = sorted.filter(z => z.smer === 'prichod')
    const odchody = sorted.filter(z => z.smer === 'odchod')
    const odpracovane = calculateDenneOdpracovane(denneZaznamy)

    let fajcMin = 0
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].smer === 'odchod' && sorted[i].dovod === 'fajcenie') {
        const next = sorted.slice(i + 1).find(n => n.smer === 'prichod')
        if (next) {
          fajcMin += (new Date(next.cas).getTime() - new Date(sorted[i].cas).getTime()) / 60000
        }
      }
    }

    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
    const dovody = [...new Set(denneZaznamy.map(z => z.dovod))]
    const hasDovolenka = dovody.includes('dovolenka')

    denneDetaily.push({
      datum: dateStr,
      prichod: prichody.length > 0 ? new Date(prichody[0].cas).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) : null,
      odchod: odchody.length > 0 ? new Date(odchody[odchody.length - 1].cas).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) : null,
      odpracovane_min: odpracovane,
      fajcenie_min: Math.round(fajcMin),
      dovody,
      typ_dna: hasDovolenka ? 'dovolenka' : isWeekend ? 'vikend' : isPracovnyDen(dateObj) ? 'pracovny' : 'sviatok',
    })
  }

  return {
    profile: profile || { full_name: '', pracovny_fond_hodiny: 8.5 },
    dni: denneDetaily,
  }
}
