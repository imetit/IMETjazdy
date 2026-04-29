import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getMesacneSumary } from '@/actions/admin-dochadzka-mzdy'
import { calculatePriplatky } from '@/lib/dochadzka-priplatky'
import { generateXLSX } from '@/lib/xlsx'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return new NextResponse('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const mesiac = url.searchParams.get('mesiac') || new Date().toISOString().slice(0, 7)
  const firmaIds = url.searchParams.get('firma')?.split(',').filter(Boolean)

  const sumary = await getMesacneSumary(mesiac, firmaIds)
  if ('error' in sumary && sumary.error) return new NextResponse(sumary.error, { status: 500 })

  const rows: (string | number)[][] = []
  for (const s of sumary.data || []) {
    const priplatky = await calculatePriplatky(s.user_id, mesiac)
    rows.push([
      s.full_name,
      s.pozicia || '',
      Math.round(s.fond_min / 60 * 100) / 100,
      Math.round(s.odpracovane_min / 60 * 100) / 100,
      Math.round(s.rozdiel_min / 60 * 100) / 100,
      s.dovolenka_dni,
      s.pn_dni,
      s.ocr_dni,
      s.sviatky_dni,
      priplatky.nadcas_hod,
      priplatky.nocna_hod,
      priplatky.sobota_hod + priplatky.nedela_hod,
      priplatky.sviatok_hod,
      s.schvalene ? 'ÁNO' : 'NIE',
    ])
  }

  const columns = [
    { header: 'Meno', width: 28 },
    { header: 'Pozícia', width: 22 },
    { header: 'Fond hod', width: 12 },
    { header: 'Odpracované hod', width: 16 },
    { header: 'Rozdiel hod', width: 12 },
    { header: 'Dovolenka dni', width: 14 },
    { header: 'PN dni', width: 10 },
    { header: 'OČR dni', width: 10 },
    { header: 'Sviatky dni', width: 12 },
    { header: 'Nadčas hod', width: 12 },
    { header: 'Nočná hod', width: 12 },
    { header: 'Víkend hod', width: 12 },
    { header: 'Sviatok hod', width: 12 },
    { header: 'Schválené', width: 12 },
  ]

  const buffer = await generateXLSX(`Mzdový podklad ${mesiac}`, columns, rows)

  return new NextResponse(buffer as never, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="mzdovy-podklad-${mesiac}.xlsx"`,
    },
  })
}
