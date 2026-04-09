import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getMajetok } from '@/actions/majetok'
import { getLicencie } from '@/actions/licencie'
import ZamestnanecDetail from '@/components/ZamestnanecDetail'
import type { Profile, Vozidlo } from '@/lib/types'

export default async function MojaKartaPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const [vozidloResult, majetokResult, licencieResult] = await Promise.all([
    profile.vozidlo_id
      ? supabase.from('vozidla').select('*').eq('id', profile.vozidlo_id).single()
      : Promise.resolve({ data: null }),
    getMajetok(user.id),
    getLicencie(user.id),
  ])

  const canSeePrices = ['admin', 'it_admin', 'fleet_manager'].includes(profile.role)

  return (
    <ZamestnanecDetail
      profile={profile as Profile}
      vozidlo={(vozidloResult.data as Vozidlo) || null}
      majetok={(majetokResult.data as any) || []}
      licencie={(licencieResult.data as any) || []}
      canSeePrices={canSeePrices}
      readonly={true}
    />
  )
}
