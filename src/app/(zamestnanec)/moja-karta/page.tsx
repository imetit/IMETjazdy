import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getMajetok } from '@/actions/majetok'
import { getLicencie } from '@/actions/licencie'
import { getSkolenia } from '@/actions/skolenia'
import ZamestnanecDetail from '@/components/ZamestnanecDetail'
import SkoleniaSection from '@/components/SkoleniaSection'
import ICalBanner from '@/components/ICalBanner'
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

  // Generate ical_token if not present
  if (!profile.ical_token) {
    const token = crypto.randomUUID()
    await supabase.from('profiles').update({ ical_token: token }).eq('id', user.id)
    profile.ical_token = token
  }

  const [vozidloResult, majetokResult, licencieResult, skoleniaResult] = await Promise.all([
    profile.vozidlo_id
      ? supabase.from('vozidla').select('*').eq('id', profile.vozidlo_id).single()
      : Promise.resolve({ data: null }),
    getMajetok(user.id),
    getLicencie(user.id),
    getSkolenia(user.id),
  ])

  const canSeePrices = ['admin', 'it_admin', 'fleet_manager'].includes(profile.role)

  return (
    <div className="space-y-6">
      <ZamestnanecDetail
        profile={profile as Profile}
        vozidlo={(vozidloResult.data as Vozidlo) || null}
        majetok={(majetokResult.data as any) || []}
        licencie={(licencieResult.data as any) || []}
        canSeePrices={canSeePrices}
        readonly={true}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <SkoleniaSection profileId={user.id} skolenia={skoleniaResult.data || []} readonly={true} />
      </div>

      <ICalBanner token={profile.ical_token!} />
    </div>
  )
}
