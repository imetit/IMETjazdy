import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getMajetok } from '@/actions/majetok'
import { getLicencie } from '@/actions/licencie'
import ZamestnanecDetail from '@/components/ZamestnanecDetail'
import type { Profile, Vozidlo } from '@/lib/types'

export default async function AdminZamestnanecDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) redirect('/admin/zamestnanci')

  const [vozidloResult, majetokResult, licencieResult] = await Promise.all([
    profile.vozidlo_id
      ? supabase.from('vozidla').select('*').eq('id', profile.vozidlo_id).single()
      : Promise.resolve({ data: null }),
    getMajetok(id),
    getLicencie(id),
  ])

  return (
    <ZamestnanecDetail
      profile={profile as Profile}
      vozidlo={(vozidloResult.data as Vozidlo) || null}
      majetok={(majetokResult.data as any) || []}
      licencie={(licencieResult.data as any) || []}
      canSeePrices={true}
      readonly={false}
      backUrl="/admin/zamestnanci"
    />
  )
}
