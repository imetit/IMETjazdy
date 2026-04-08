import { createSupabaseServer } from '@/lib/supabase-server'
import VozidlaTable from '@/components/VozidlaTable'
import HelpTip from '@/components/HelpTip'
import type { Vozidlo } from '@/lib/types'

export default async function AdminVozidlaPage() {
  const supabase = await createSupabaseServer()
  const { data: vozidla } = await supabase.from('vozidla').select('*').order('created_at')
  return (
    <div>
      <HelpTip id="admin-vozidla" title="Správa vozidiel">
        Tu spravujete firemné vozidlá pre Knihu jázd. Každé vozidlo má značku, ŠPZ, typ paliva a normovanú spotrebu podľa TP.
        Normovaná spotreba sa používa pri výpočte náhrad za PHM. Pridajte vozidlo tlačidlom hore a priraďte ho zamestnancovi v sekcii Zamestnanci.
      </HelpTip>
      <VozidlaTable vozidla={(vozidla || []) as Vozidlo[]} />
    </div>
  )
}
