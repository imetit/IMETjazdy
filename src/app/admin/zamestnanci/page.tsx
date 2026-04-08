import { createSupabaseServer } from '@/lib/supabase-server'
import ZamestnanciTable from '@/components/ZamestnanciTable'
import HelpTip from '@/components/HelpTip'
import type { Profile, Vozidlo } from '@/lib/types'

export default async function AdminZamestnanciPage() {
  const supabase = await createSupabaseServer()
  const { data: zamestnanci } = await supabase.from('profiles').select('*, vozidlo:vozidla(*)').eq('role', 'zamestnanec').order('full_name')
  const { data: vozidla } = await supabase.from('vozidla').select('*').eq('aktivne', true).order('znacka')
  return (
    <div>
      <HelpTip id="admin-zamestnanci" title="Správa zamestnancov"
        steps={[
          'Pridajte nového zamestnanca tlačidlom "Pridať zamestnanca" — zadáte email, meno a heslo',
          'Každému zamestnancovi priraďte vozidlo z dropdown menu — to určí aké auto sa mu zobrazí pri zadávaní jázd',
          'Zamestnanca môžete deaktivovať — nebude sa môcť prihlásiť, ale jeho jazdy ostanú',
        ]}
      >
        Zamestnanci sú ľudia, ktorí zadávajú jazdy v systéme. Každý zamestnanec sa prihlasuje vlastným emailom a heslom. Po prihlásení vidí len svoje jazdy.
      </HelpTip>
      <ZamestnanciTable zamestnanci={(zamestnanci || []) as (Profile & { vozidlo?: Vozidlo | null })[]} vozidla={(vozidla || []) as Vozidlo[]} />
    </div>
  )
}
