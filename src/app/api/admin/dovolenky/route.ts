import { NextResponse } from 'next/server'
import { getDovolenkyNaSchvalenie } from '@/actions/dovolenky'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 403 })
  const result = await getDovolenkyNaSchvalenie()
  return NextResponse.json(result)
}
