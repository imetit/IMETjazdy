import { NextResponse } from 'next/server'
import { getFakturyList } from '@/actions/faktury'
import type { FakturaStav } from '@/lib/faktury-types'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const stav = url.searchParams.get('stav') as FakturaStav | 'all' | null
  const firma_id = url.searchParams.get('firma_id') || undefined
  const mesiac = url.searchParams.get('mesiac') || undefined
  const overdue = url.searchParams.get('overdue') === '1'
  const result = await getFakturyList({ stav: stav || undefined, firma_id, mesiac, overdue })
  if ('error' in result && result.error) return NextResponse.json({ error: result.error }, { status: 403 })
  return NextResponse.json({ data: result.data })
}
