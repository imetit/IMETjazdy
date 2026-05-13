import { NextResponse } from 'next/server'
import { getAdminDashboardData } from '@/lib/cached-pages'
import { requireAdmin } from '@/lib/auth-helpers'
import { getFirmaScopeKeyForUser } from '@/lib/firma-scope'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 403 })
  const url = new URL(req.url)
  const mesiac = url.searchParams.get('mesiac') || new Date().toISOString().slice(0, 7)
  const firmaIdsKey = await getFirmaScopeKeyForUser(auth.user.id)
  const data = await getAdminDashboardData(mesiac, firmaIdsKey)
  return NextResponse.json(data)
}
