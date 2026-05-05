import { NextResponse } from 'next/server'
import { getAdminZamestnanci } from '@/lib/cached-pages'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 403 })
  const data = await getAdminZamestnanci()
  return NextResponse.json(data)
}
