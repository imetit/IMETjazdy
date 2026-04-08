import { createSupabaseServer } from '@/lib/supabase-server'
import PalivaGrid from '@/components/PalivaGrid'
import HelpTip from '@/components/HelpTip'
import type { Paliva } from '@/lib/types'

export default async function AdminPalivaPage() {
  const supabase = await createSupabaseServer()
  const { data: paliva } = await supabase.from('paliva').select('*').single()
  return (
    <div>
      <HelpTip id="admin-paliva" title="Ceny palív">
        Tu nastavujete aktuálne ceny palív za liter. Tieto ceny sa používajú pri výpočte náhrad za PHM pri firemných vozidlách.
        Kliknite na cenu a zadajte novú hodnotu. <strong>Odporúčanie:</strong> aktualizujte ceny aspoň raz mesačne podľa aktuálnych cien na čerpacích staniciach.
        Ak zamestnanec zadá reálnu spotrebu z bločku, systém vypočíta priemernú cenu a porovná ju s touto nastavenou cenou.
      </HelpTip>
      <PalivaGrid paliva={paliva as Paliva} />
    </div>
  )
}
