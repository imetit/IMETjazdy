import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/get-session'
import { getAccessibleFirmaIds } from '@/lib/firma-scope'
import { redirect } from 'next/navigation'
import UzavierkaPanel from '@/components/dochadzka/UzavierkaPanel'

interface PageProps { searchParams: Promise<{ mesiac?: string }> }

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams
  const { profile } = await getSession()
  if (!profile) redirect('/login')

  const mesiac = sp.mesiac || new Date().toISOString().slice(0, 7)
  const accessible = await getAccessibleFirmaIds(profile.id)

  const admin = createSupabaseAdmin()
  let firmyQuery = admin.from('firmy').select('*').eq('aktivna', true).order('poradie')
  if (accessible !== null) firmyQuery = firmyQuery.in('id', accessible)
  const { data: firmy } = await firmyQuery

  // Pre každú firmu načítaj uzávierku + pocet zamestnancov + pocet schválených + auto/anomalie
  const data = []
  for (const f of firmy || []) {
    const [uzRes, empRes, schvRes, autoRes] = await Promise.all([
      admin.from('dochadzka_uzavierka').select('*').eq('firma_id', f.id).eq('mesiac', mesiac).maybeSingle(),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('firma_id', f.id).eq('active', true).neq('role', 'tablet'),
      admin.from('dochadzka_schvalene_hodiny').select('user_id', { count: 'exact', head: true }).eq('mesiac', mesiac).in('user_id',
        ((await admin.from('profiles').select('id').eq('firma_id', f.id).eq('active', true)).data || []).map(p => p.id)),
      admin.from('dochadzka').select('id', { count: 'exact', head: true }).eq('auto_doplnene', true)
        .gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-31`),
    ])
    data.push({
      firma: f,
      uzavierka: uzRes.data,
      pocet_zamestnancov: empRes.count || 0,
      pocet_schvalenych: schvRes.count || 0,
      pocet_auto_doplnenych: autoRes.count || 0,
    })
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Mesačná uzávierka</h2>
      <p className="text-sm text-gray-500 mb-4">Mesiac: <span className="font-mono font-semibold">{mesiac}</span></p>
      <UzavierkaPanel data={data} mesiac={mesiac} canBreak={profile.role === 'it_admin'} />
    </div>
  )
}
