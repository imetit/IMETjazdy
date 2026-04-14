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
import ZamestnanecSettingsSection from '@/components/ZamestnanecSettingsSection'
import { updateZamestnanecRole } from '@/actions/zamestnanci'
import type { Profile, Vozidlo } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminZamestnanecDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createSupabaseAdmin()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) redirect('/admin/zamestnanci')

  const [vozidloResult, majetokResult, licencieResult, rfidResult, narokResult, modulyResult, allVozidlaResult, allProfilesResult, firmyResult] = await Promise.all([
    profile.vozidlo_id
      ? supabase.from('vozidla').select('*').eq('id', profile.vozidlo_id).single()
      : Promise.resolve({ data: null }),
    getMajetok(id),
    getLicencie(id),
    getRfidKarty(id),
    getDovolenkaNarok(id, new Date().getFullYear()),
    getUserModuly(id),
    supabase.from('vozidla').select('id, znacka, variant, spz').eq('aktivne', true).order('znacka'),
    supabase.from('profiles').select('id, full_name, role').eq('active', true).neq('role', 'tablet').neq('id', id).order('full_name'),
    supabase.from('firmy').select('id, kod, nazov').eq('aktivna', true).order('poradie'),
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
        <ZamestnanecSettingsSection
          userId={id}
          currentVozidloId={profile.vozidlo_id || null}
          currentNadriadenyId={profile.nadriadeny_id || null}
          currentZastupujeId={profile.zastupuje_id || null}
          currentTypUvazku={(profile.typ_uvazku as any) || 'tpp'}
          currentPin={profile.pin || ''}
          currentTyzdnovyFond={profile.tyzdnovy_fond_hodiny || 42.5}
          currentPracovneDniTyzdne={profile.pracovne_dni_tyzdne || 5}
          currentPozicia={profile.pozicia || ''}
          currentFirmaId={profile.firma_id || null}
          currentDatumNastupu={profile.datum_nastupu || null}
          vozidla={(allVozidlaResult.data || []) as { id: string; znacka: string; variant: string; spz: string }[]}
          zamestnanci={(allProfilesResult.data || []) as { id: string; full_name: string; role: string }[]}
          firmy={(firmyResult.data || []) as { id: string; kod: string; nazov: string }[]}
        />
      </div>

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
