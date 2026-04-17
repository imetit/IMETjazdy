import { createSupabaseServer } from '@/lib/supabase-server'
import AdminJazdyTable from '@/components/AdminJazdyTable'
import HelpTip from '@/components/HelpTip'
import ModuleHelp from '@/components/ModuleHelp'
import type { Jazda } from '@/lib/types'

export default async function AdminJazdyPage() {
  const supabase = await createSupabaseServer()
  const { data: jazdy } = await supabase.from('jazdy').select('*, profile:profiles(full_name)').order('created_at', { ascending: false })

  return (
    <div>
      <ModuleHelp title="Prijaté jazdy — Spracovanie">
        <p><strong>Čo tu nájdete:</strong> Zoznam všetkých jázd odoslaných zamestnancami na spracovanie.</p>
        <p><strong>Stavy jázd:</strong> Rozpracovaná (zamestnanec ju ešte neodoslal), Odoslaná (čaká na vaše spracovanie), Spracovaná (hotovo, náhrady vypočítané).</p>
        <p><strong>Kliknutie na riadok:</strong> Otvorí detail jazdy kde ju môžete spracovať — vybrať typ, skontrolovať údaje a kliknúť "Spracovať".</p>
        <p><strong>Zaškrtávacie políčka:</strong> Zaškrtnite viacero jázd v stave "Odoslaná" pre hromadné spracovanie alebo vrátenie.</p>
        <p><strong>"Spracovať vybrané":</strong> Hromadne spracuje všetky zaškrtnuté jazdy — vypočíta náhrady a pridelí čísla dokladov.</p>
        <p><strong>"Vrátiť vybrané":</strong> Vráti jazdy zamestnancom s komentárom čo treba opraviť.</p>
        <p><strong>Filter "Stav":</strong> Filtrujte jazdy podľa stavu (rozpracovaná / odoslaná / spracovaná).</p>
        <p><strong>Export CSV:</strong> Exportujte zobrazené dáta do CSV súboru.</p>
      </ModuleHelp>
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
