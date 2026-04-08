import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PoistnaUdalostForm from '@/components/fleet/PoistnaUdalostForm'

export default async function NahlasitUdalostPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Get assigned vehicle
  let vozidlo = null
  const { data: v } = await supabase
    .from('vozidla')
    .select('*')
    .eq('priradeny_vodic_id', user.id)
    .limit(1)
    .maybeSingle()
  vozidlo = v

  if (!vozidlo && profile.vozidlo_id) {
    const { data: v2 } = await supabase.from('vozidla').select('*').eq('id', profile.vozidlo_id).single()
    vozidlo = v2
  }

  if (!vozidlo) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Nahlásiť poistnú udalosť</h1>
        <p className="text-gray-500">Nemáte pridelené vozidlo.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nahlásiť poistnú udalosť</h1>
      <PoistnaUdalostForm vozidlo={vozidlo as any} userName={profile.full_name} />
    </div>
  )
}
