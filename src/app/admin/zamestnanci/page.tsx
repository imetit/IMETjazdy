import { createSupabaseAdmin } from '@/lib/supabase-admin'
import ZamestnanciTable from '@/components/ZamestnanciTable'
import HelpTip from '@/components/HelpTip'
import type { Profile, Vozidlo } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminZamestnanciPage() {
  let zamestnanci: any[] = []
  let vozidla: any[] = []
  let debugError: string | null = null

  try {
    const supabase = createSupabaseAdmin()
    const { data: z, error: zErr } = await supabase.from('profiles').select('*, vozidlo:vozidla!fk_profiles_vozidlo(*)').neq('role', 'tablet').order('full_name')
    const { data: v, error: vErr } = await supabase.from('vozidla').select('*').eq('aktivne', true).order('znacka')

    if (zErr) debugError = `Profiles: ${zErr.message}`
    if (vErr) debugError = (debugError || '') + ` Vozidla: ${vErr.message}`

    zamestnanci = z || []
    vozidla = v || []
  } catch (e: any) {
    debugError = `Exception: ${e.message}`
  }

  return (
    <div>
      {debugError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 text-sm">
          <strong>Debug:</strong> {debugError}
        </div>
      )}
      <HelpTip id="admin-zamestnanci" title="Správa zamestnancov"
        steps={[
          'Pridajte nového zamestnanca tlačidlom "Pridať zamestnanca" — zadáte email, meno, heslo a rolu',
          'Každému zamestnancovi priraďte vozidlo z dropdown menu',
          'Kliknite na meno zamestnanca pre detail — tam nastavíte oprávnenia, moduly, PIN, fond',
          'Zamestnanca môžete deaktivovať — nebude sa môcť prihlásiť',
        ]}
      >
        Tu spravujete všetkých zamestnancov v systéme. Kliknite na meno pre nastavenie oprávnení a modulov.
      </HelpTip>
      <ZamestnanciTable zamestnanci={zamestnanci as (Profile & { vozidlo?: Vozidlo | null })[]} vozidla={vozidla as Vozidlo[]} />
    </div>
  )
}
