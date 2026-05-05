import { NextResponse } from 'next/server'
import { getMesacneSumary, getVPraciDnes } from '@/actions/admin-dochadzka-mzdy'
import { getAccessibleFirmaIds } from '@/lib/firma-scope'
import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 403 })
  const url = new URL(req.url)
  const mesiac = url.searchParams.get('mesiac') || new Date().toISOString().slice(0, 7)

  const accessibleFirmaIds = await getAccessibleFirmaIds(auth.user.id)
  const admin = createSupabaseAdmin()

  let firmyQuery = admin.from('firmy').select('id, nazov, kod').eq('aktivna', true).order('poradie')
  if (accessibleFirmaIds !== null) firmyQuery = firmyQuery.in('id', accessibleFirmaIds)

  const [firmyRes, uzavierkyRes, sumaryRes, vPraciRes] = await Promise.all([
    firmyQuery,
    admin.from('dochadzka_uzavierka').select('firma_id, mesiac, stav').eq('mesiac', mesiac),
    getMesacneSumary(mesiac),
    getVPraciDnes(),
  ])

  return NextResponse.json({
    firmy: firmyRes.data || [],
    uzavierky: uzavierkyRes.data || [],
    sumary: sumaryRes.data || [],
    vPraci: vPraciRes.data || [],
  })
}
