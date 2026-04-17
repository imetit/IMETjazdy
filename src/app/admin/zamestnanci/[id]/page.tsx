import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import { getMajetok } from '@/actions/majetok'
import { getLicencie } from '@/actions/licencie'
import { getRfidKarty } from '@/actions/rfid-karty'
import { getDovolenkaNarok } from '@/actions/dovolenky-naroky'
import { getUserModuly } from '@/actions/permissions'
import { getOnboardingItems } from '@/actions/onboarding'
import { getSkolenia } from '@/actions/skolenia'
import ZamestnanecDetail from '@/components/ZamestnanecDetail'
import RfidKartySection from '@/components/RfidKartySection'
import DovolenkaNarokSection from '@/components/DovolenkaNarokSection'
import UserPermissionsSection from '@/components/UserPermissionsSection'
import ZamestnanecSettingsSection from '@/components/ZamestnanecSettingsSection'
import OnboardingSection from '@/components/OnboardingSection'
import SkoleniaSection from '@/components/SkoleniaSection'
import AdminZamestnanecActions from '@/components/AdminZamestnanecActions'
import { updateZamestnanecRole } from '@/actions/zamestnanci'
import ModuleHelp from '@/components/ModuleHelp'
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

  const [vozidloResult, majetokResult, licencieResult, rfidResult, narokResult, modulyResult, allVozidlaResult, allProfilesResult, firmyResult, onboardingResult, skoleniaResult] = await Promise.all([
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
    getOnboardingItems(id),
    getSkolenia(id),
  ])

  // Separate onboarding and offboarding items
  const allOnboardingItems = onboardingResult.data || []
  const onboardingItems = allOnboardingItems.filter((i: any) => !i.typ.startsWith('offboarding_'))
  const offboardingItems = allOnboardingItems.filter((i: any) => i.typ.startsWith('offboarding_'))

  // Get firma info for PDF
  const firmaForProfile = profile.firma_id
    ? (firmyResult.data || []).find((f: any) => f.id === profile.firma_id)
    : null

  async function handleRoleChange(role: string) {
    'use server'
    return updateZamestnanecRole(id, role)
  }

  return (
    <div className="space-y-6">
      <ModuleHelp title="Detail zamestnanca">
        <p><strong>Čo tu nájdete:</strong> Kompletný profil zamestnanca so všetkými priradeniami a akciami.</p>
        <p><strong>Oprávnenia:</strong> Nastavte rolu (zamestnanec/admin/fleet/fin_manager/it_admin) a prístup k jednotlivým modulom (view/edit/admin).</p>
        <p><strong>Nastavenia:</strong> Priradenie vozidla, nadriadeného, zastupujúceho, firma, úväzok, fond hodín, PIN, dátum nástupu.</p>
        <p><strong>Majetok:</strong> Zoznam prideleného IT vybavenia (notebook, telefón...). Pridať/odobrať.</p>
        <p><strong>Licencie:</strong> Softvérové licencie priradené zamestnancovi.</p>
        <p><strong>RFID karty:</strong> Prístupové karty pre dochádzku a vstup.</p>
        <p><strong>Školenia:</strong> BOZP, OPP, vodičák, odborné. Nahrajte certifikát, nastavte platnosť — systém upozorní na expiráciu.</p>
        <p><strong>Onboarding:</strong> Checklist pre nového zamestnanca (BOZP, majetok, karty, prístupy, zmluva). Kliknite &quot;Spustiť onboarding&quot;.</p>
        <p><strong>Offboarding:</strong> Pri odchode kliknite &quot;Spustiť offboarding&quot; — vytvorí sa checklist (vrátenie majetku, kariet, vozidla). Po dokončení sa profil deaktivuje.</p>
        <p><strong>&quot;Exportovať PDF&quot;:</strong> Stiahne kompletnú zamestnaneckú kartu ako PDF.</p>
      </ModuleHelp>
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

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <OnboardingSection profileId={id} items={onboardingItems} />
      </div>

      {offboardingItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <OnboardingSection profileId={id} items={offboardingItems} isOffboarding />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <SkoleniaSection profileId={id} skolenia={skoleniaResult.data || []} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <AdminZamestnanecActions
          profile={profile as Profile}
          vozidlo={(vozidloResult.data as Vozidlo) || null}
          majetok={(majetokResult.data as any) || []}
          licencie={(licencieResult.data as any) || []}
          skolenia={skoleniaResult.data || []}
          firma={firmaForProfile}
          hasOffboardingItems={offboardingItems.length > 0}
        />
      </div>
    </div>
  )
}
