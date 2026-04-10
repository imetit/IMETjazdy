import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import { getMajetok } from '@/actions/majetok'
import { getLicencie } from '@/actions/licencie'
import { getRfidKarty } from '@/actions/rfid-karty'
import { getDovolenkaNarok } from '@/actions/dovolenky-naroky'
import { getUserModuly } from '@/actions/permissions'
import ZamestnanecDetail from '@/components/ZamestnanecDetail'
import RfidKartySection from '@/components/RfidKartySection'
import DovolenkaNarokSection from '@/components/DovolenkaNarokSection'
import UserPermissionsSection from '@/components/UserPermissionsSection'
import { updateZamestnanecRole } from '@/actions/zamestnanci'
import type { Profile, Vozidlo } from '@/lib/types'

export default async function AdminZamestnanecDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createSupabaseAdmin()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) redirect('/admin/zamestnanci')

  const [vozidloResult, majetokResult, licencieResult, rfidResult, narokResult, modulyResult] = await Promise.all([
    profile.vozidlo_id
      ? supabase.from('vozidla').select('*').eq('id', profile.vozidlo_id).single()
      : Promise.resolve({ data: null }),
    getMajetok(id),
    getLicencie(id),
    getRfidKarty(id),
    getDovolenkaNarok(id, new Date().getFullYear()),
    getUserModuly(id),
  ])

  async function handleRoleChange(role: string) {
    'use server'
    return updateZamestnanecRole(id, role)
  }

  return (
    <div className="space-y-6">
      <ZamestnanecDetail
        profile={profile as Profile}
        vozidlo={(vozidloResult.data as Vozidlo) || null}
        majetok={(majetokResult.data as any) || []}
        licencie={(licencieResult.data as any) || []}
        canSeePrices={true}
        readonly={false}
        backUrl="/admin/zamestnanci"
      />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <UserPermissionsSection
          userId={id}
          currentRole={profile.role}
          moduly={modulyResult.data || []}
          onRoleChange={handleRoleChange}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <RfidKartySection userId={id} karty={(rfidResult.data as any) || []} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <DovolenkaNarokSection userId={id} narok={narokResult.data || null} />
      </div>
    </div>
  )
}
