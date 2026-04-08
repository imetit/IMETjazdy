import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getKontroly } from '@/actions/fleet-kontroly'
import { getZnamky } from '@/actions/fleet-znamky'
import { getDokumenty } from '@/actions/fleet-dokumenty'
import MojeVozidlo from '@/components/fleet/MojeVozidlo'
import { Car } from 'lucide-react'

export default async function MojeVozidloPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Try finding vehicle by priradeny_vodic_id first, fallback to profile.vozidlo_id
  let { data: vozidlo } = await supabase
    .from('vozidla')
    .select('*')
    .eq('priradeny_vodic_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!vozidlo) {
    const { data: profile } = await supabase.from('profiles').select('vozidlo_id').eq('id', user.id).single()
    if (profile?.vozidlo_id) {
      const { data: v } = await supabase.from('vozidla').select('*').eq('id', profile.vozidlo_id).single()
      vozidlo = v
    }
  }

  if (!vozidlo) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Moje vozidlo</h1>
        <div className="text-center py-12">
          <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4"><Car size={32} className="text-gray-400" /></div>
          <h2 className="text-xl font-semibold mb-2">Nemáte pridelené vozidlo</h2>
          <p className="text-gray-500">Kontaktujte správcu vozového parku.</p>
        </div>
      </div>
    )
  }

  const [kontrolyResult, znamkyResult, dokumentyResult] = await Promise.all([
    getKontroly({ vozidloId: vozidlo.id }),
    getZnamky(vozidlo.id),
    getDokumenty(vozidlo.id),
  ])

  const pzpDocs = (dokumentyResult.data || []).filter((d: any) =>
    ['pzp_dokument', 'asistencna_karta'].includes(d.typ)
  )

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Moje vozidlo</h1>
      <MojeVozidlo
        vozidlo={vozidlo as any}
        kontroly={(kontrolyResult.data as any) || []}
        znamky={(znamkyResult.data as any) || []}
        dokumenty={pzpDocs as any}
      />
    </div>
  )
}
