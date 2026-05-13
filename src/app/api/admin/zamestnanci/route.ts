import { NextResponse } from 'next/server'
import { getAdminZamestnanci } from '@/lib/cached-pages'
import { requireAdmin } from '@/lib/auth-helpers'
import { getFirmaScopeKeyForUser } from '@/lib/firma-scope'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 403 })
  const firmaIdsKey = await getFirmaScopeKeyForUser(auth.user.id)
  const data = await getAdminZamestnanci(firmaIdsKey)
  return NextResponse.json(data)
}
