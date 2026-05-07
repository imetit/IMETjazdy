import { NextResponse } from 'next/server'
import { getCashflowForecast } from '@/actions/faktury'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const today = new Date()
  const od = url.searchParams.get('od') || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const doDate = new Date(today.getFullYear(), today.getMonth() + 3, 1)
  const doStr = url.searchParams.get('do') || `${doDate.getFullYear()}-${String(doDate.getMonth() + 1).padStart(2, '0')}`
  const result = await getCashflowForecast(od, doStr)
  if ('error' in result && result.error) return NextResponse.json({ error: result.error }, { status: 403 })
  return NextResponse.json({ data: result.data })
}
