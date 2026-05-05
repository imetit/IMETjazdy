import { NextResponse } from 'next/server'
import { getAdminJazdy } from '@/lib/cached-pages'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 403 })
  const data = await getAdminJazdy()
  return NextResponse.json({ data })
}
