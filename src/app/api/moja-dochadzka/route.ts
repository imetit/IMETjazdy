// src/app/api/moja-dochadzka/route.ts
import { createSupabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Neprihlásený' }, { status: 401 })

  const mesiac = request.nextUrl.searchParams.get('mesiac') || ''
  const [rok, mes] = mesiac.split('-').map(Number)
  if (!rok || !mes) return NextResponse.json({ error: 'Neplatný mesiac' }, { status: 400 })

  const startDate = `${rok}-${String(mes).padStart(2, '0')}-01`
  const endDate = `${rok}-${String(mes).padStart(2, '0')}-${new Date(rok, mes, 0).getDate()}`

  const [zaznamyRes, profileRes] = await Promise.all([
    supabase.from('dochadzka').select('*').eq('user_id', user.id).gte('datum', startDate).lte('datum', endDate).order('cas'),
    supabase.from('profiles').select('pracovny_fond_hodiny').eq('id', user.id).single(),
  ])

  return NextResponse.json({
    zaznamy: zaznamyRes.data || [],
    fondHodiny: profileRes.data?.pracovny_fond_hodiny || 8.5,
  })
}
