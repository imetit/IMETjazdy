import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getKontroly } from '@/actions/fleet-kontroly'
import MojeVozidlo from '@/components/fleet/MojeVozidlo'
import { Car } from 'lucide-react'

export default async function MojeVozidloPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vozidlo } = await supabase
    .from('vozidla')
    .select('*')
    .eq('priradeny_vodic_id', user.id)
    .single()

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

  const { data: kontroly } = await getKontroly({ vozidloId: vozidlo.id })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Moje vozidlo</h1>
      <MojeVozidlo vozidlo={vozidlo as any} kontroly={(kontroly as any) || []} />
    </div>
  )
}
