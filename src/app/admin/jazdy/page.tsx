import { createSupabaseServer } from '@/lib/supabase-server'
import AdminJazdyTable from '@/components/AdminJazdyTable'
import HelpTip from '@/components/HelpTip'
import type { Jazda } from '@/lib/types'

export default async function AdminJazdyPage() {
  const supabase = await createSupabaseServer()
  const { data: jazdy } = await supabase.from('jazdy').select('*, profile:profiles(full_name)').order('created_at', { ascending: false })

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Prijaté jazdy</h2>
      <HelpTip id="admin-jazdy" title="Ako spracovať jazdu"
        steps={[
          'Zamestnanec zadá a odošle jazdu — zobrazí sa tu so stavom "Odoslaná"',
          'Kliknite na riadok pre zobrazenie detailu jazdy',
          'V detaile môžete upraviť údaje, vybrať typ vyúčtovania a spracovať',
          'Spracovanú jazdu môžete tlačiť, exportovať do PDF alebo prepočítať',
        ]}
      >
        Tu sa zobrazujú jazdy od všetkých zamestnancov. Použite vyhľadávanie a filtre na rýchle nájdenie záznamov.
      </HelpTip>
      <AdminJazdyTable jazdy={(jazdy || []) as (Jazda & { profile: { full_name: string } })[]} />
    </div>
  )
}
