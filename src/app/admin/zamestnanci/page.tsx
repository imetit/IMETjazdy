import { createSupabaseAdmin } from '@/lib/supabase-admin'
import ZamestnanciTable from '@/components/ZamestnanciTable'
import HelpTip from '@/components/HelpTip'
import type { Profile, Vozidlo } from '@/lib/types'

export default async function AdminZamestnanciPage() {
  // Use admin client to bypass RLS - this page is already protected by middleware + layout
  const supabase = createSupabaseAdmin()
  const { data: zamestnanci } = await supabase.from('profiles').select('*, vozidlo:vozidla(*)').neq('role', 'tablet').order('full_name')
  const { data: vozidla } = await supabase.from('vozidla').select('*').eq('aktivne', true).order('znacka')
  return (
    <div>
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
      <ZamestnanciTable zamestnanci={(zamestnanci || []) as (Profile & { vozidlo?: Vozidlo | null })[]} vozidla={(vozidla || []) as Vozidlo[]} />
    </div>
  )
}
