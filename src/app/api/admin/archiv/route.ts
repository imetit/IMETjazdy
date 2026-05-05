import { NextResponse } from 'next/server'
import { getAdminArchiv } from '@/lib/cached-pages'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 403 })
  const url = new URL(req.url)
  const kategoria = url.searchParams.get('kategoria') || undefined
  const data = await getAdminArchiv(kategoria)
  return NextResponse.json(data)
}
