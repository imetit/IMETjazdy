import { NextResponse } from 'next/server'
import { getFakturyList } from '@/actions/faktury'
import { generateXLSX } from '@/lib/xlsx'
import { FAKTURA_STAV_LABELS } from '@/lib/faktury-types'
import type { Faktura, FakturaStav } from '@/lib/faktury-types'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const stav = url.searchParams.get('stav') as FakturaStav | 'all' | null
  const overdue = url.searchParams.get('overdue') === '1'
  const result = await getFakturyList({ stav: stav || undefined, overdue })
  if ('error' in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 })
  }

  const faktury = result.data as (Faktura & { dodavatel?: { nazov: string }; firma?: { kod: string }; nahral?: { full_name: string } })[]

  const buf = await generateXLSX(
    'Faktúry',
    [
      { header: 'Číslo faktúry', width: 18 },
      { header: 'Dodávateľ', width: 28 },
      { header: 'IČO', width: 12 },
      { header: 'VS', width: 12 },
      { header: 'Mena', width: 6 },
      { header: 'Suma celkom', width: 14 },
      { header: 'Suma EUR', width: 14 },
      { header: 'DPH %', width: 8 },
      { header: 'Splatnosť', width: 12 },
      { header: 'Vystavená', width: 12 },
      { header: 'Uhradená', width: 12 },
      { header: 'Stav', width: 18 },
      { header: 'Firma', width: 10 },
      { header: 'Nahral', width: 22 },
      { header: 'Dobropis', width: 10 },
      { header: 'Vytvorená', width: 18 },
    ],
    faktury.map(f => [
      f.cislo_faktury,
      f.dodavatel_nazov,
      f.dodavatel_ico,
      f.variabilny_symbol,
      f.mena,
      Number(f.suma_celkom),
      Number(f.suma_celkom_eur || 0),
      Number(f.dph_sadzba),
      f.datum_splatnosti,
      f.datum_vystavenia,
      f.datum_uhrady,
      FAKTURA_STAV_LABELS[f.stav] || f.stav,
      f.firma?.kod || '',
      f.nahral?.full_name || '',
      f.je_dobropis ? 'ÁNO' : '',
      f.created_at?.slice(0, 16),
    ]),
  )

  const today = new Date().toISOString().split('T')[0]
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="faktury-${today}.xlsx"`,
    },
  })
}
