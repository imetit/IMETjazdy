import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import HlasenieForm from '@/components/fleet/HlasenieForm'

export default async function NahlasitProblemPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vozidlo } = await supabase
    .from('vozidla')
    .select('*')
    .eq('priradeny_vodic_id', user.id)
    .single()

  const { data: vozidla } = await supabase
    .from('vozidla')
    .select('*')
    .in('stav', ['aktivne', 'servis'])
    .order('znacka')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nahlásiť problém</h1>
      <HlasenieForm vozidla={(vozidla as any) || []} defaultVozidloId={vozidlo?.id} />
    </div>
  )
}
