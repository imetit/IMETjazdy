import { NextResponse } from 'next/server'
import { getDodavatelia } from '@/actions/dodavatelia'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const search = url.searchParams.get('search') || undefined
  const result = await getDodavatelia(search)
  if ('error' in result && result.error) return NextResponse.json({ error: result.error }, { status: 403 })
  return NextResponse.json({ data: result.data })
}
