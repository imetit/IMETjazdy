// CSV export dochádzky pre mzdovú účtareň
// /api/reporty/mzdy?mesiac=YYYY-MM
// Prístup: admin / it_admin / fin_manager

import { NextResponse } from 'next/server'
import { requireFinOrAdmin } from '@/lib/auth-helpers'
import { isPracovnyDen } from '@/lib/dochadzka-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return new NextResponse(auth.error, { status: 403 })

  const { searchParams } = new URL(request.url)
  const mesiac = searchParams.get('mesiac') || new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(mesiac)) return new NextResponse('Invalid mesiac', { status: 400 })

  const [rok, mes] = mesiac.split('-').map(Number)
  const startDate = `${rok}-${String(mes).padStart(2, '0')}-01`
  const endDate = `${rok}-${String(mes).padStart(2, '0')}-${new Date(rok, mes, 0).getDate()}`

  const { data: profiles } = await auth.supabase
    .from('profiles')
    .select('id, full_name, email, pracovny_fond_hodiny, typ_uvazku')
    .eq('active', true)
    .in('role', ['zamestnanec', 'fleet_manager', 'admin', 'fin_manager'])
    .order('full_name')

  const { data: dochadzka } = await auth.supabase
    .from('dochadzka')
    .select('user_id, datum, smer, dovod, cas')
    .gte('datum', startDate)
    .lte('datum', endDate)
    .order('cas')

  const { data: dovolenky } = await auth.supabase
    .from('dovolenky')
    .select('user_id, typ, datum_od, datum_do, pol_dna, stav')
    .eq('stav', 'schvalena')
    .lte('datum_od', endDate)
    .gte('datum_do', startDate)

  const header = ['meno', 'email', 'typ_uvazku', 'fond_h_den', 'odpracovane_h', 'dovolenka_dni', 'pn_dni', 'ocr_dni', 'nahradne_dni', 'neplatene_dni']

  const rows: string[][] = [header]

  for (const p of (profiles || []) as Array<{ id: string; full_name: string; email: string; pracovny_fond_hodiny: number | null; typ_uvazku: string | null }>) {
    // Odpracované minúty z dochádzky (prichod/odchod s dovodom='praca')
    const zaznamy = (dochadzka || []).filter((d: any) => d.user_id === p.id)
    const denne = new Map<string, any[]>()
    for (const z of zaznamy) {
      if (!denne.has(z.datum)) denne.set(z.datum, [])
      denne.get(z.datum)!.push(z)
    }

    let odpracovaneMin = 0
    for (const [, zs] of denne) {
      const sorted = zs.sort((a, b) => new Date(a.cas).getTime() - new Date(b.cas).getTime())
      let lastPrichodPraca: Date | null = null
      for (const z of sorted) {
        if (z.smer === 'prichod' && z.dovod === 'praca') {
          lastPrichodPraca = new Date(z.cas)
        } else if (z.smer === 'odchod' && z.dovod === 'praca' && lastPrichodPraca) {
          odpracovaneMin += Math.max(0, (new Date(z.cas).getTime() - lastPrichodPraca.getTime()) / 60000)
          lastPrichodPraca = null
        }
      }
    }

    // Leave counts (iba pracovné dni v mesiaci)
    const counts = { dovolenka: 0, sick_leave: 0, ocr: 0, nahradne_volno: 0, neplatene_volno: 0 }
    const relevantne = (dovolenky || []).filter((d: any) => d.user_id === p.id)
    for (const d of relevantne as Array<{ user_id: string; typ: keyof typeof counts; datum_od: string; datum_do: string; pol_dna: boolean }>) {
      // Ořízni na rozsah mesiaca
      const fromD = new Date(d.datum_od < startDate ? startDate : d.datum_od)
      const toD = new Date(d.datum_do > endDate ? endDate : d.datum_do)
      if (d.pol_dna) {
        if (isPracovnyDen(fromD) && d.datum_od === d.datum_do) counts[d.typ] += 0.5
        continue
      }
      const cur = new Date(fromD)
      while (cur <= toD) {
        if (isPracovnyDen(cur)) counts[d.typ] += 1
        cur.setDate(cur.getDate() + 1)
      }
    }

    rows.push([
      p.full_name,
      p.email,
      p.typ_uvazku || 'tpp',
      String(p.pracovny_fond_hodiny ?? 8.5),
      (odpracovaneMin / 60).toFixed(2),
      String(counts.dovolenka),
      String(counts.sick_leave),
      String(counts.ocr),
      String(counts.nahradne_volno),
      String(counts.neplatene_volno),
    ])
  }

  const csv = rows.map(r => r.map(c => {
    let s = String(c)
    // Formula injection escape: ak začína =, +, -, @, tab, CR → prepend '
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    s = s.replace(/"/g, '""')
    return /[,"\n;]/.test(s) ? `"${s}"` : s
  }).join(';')).join('\r\n')

  // BOM pre Excel (UTF-8)
  const body = '\uFEFF' + csv

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mzdy-${mesiac}.csv"`,
    },
  })
}
