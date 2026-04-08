import { getKontroly } from '@/actions/fleet-kontroly'
import { getVozidla } from '@/actions/fleet-vozidla'
import KontrolyTable from '@/components/fleet/KontrolyTable'
import HelpTip from '@/components/HelpTip'

export default async function FleetKontrolyPage() {
  const [kontrolyResult, vozidlaResult] = await Promise.all([getKontroly(), getVozidla()])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Kontroly — STK / EK / Poistenie</h1>
      <HelpTip id="fleet-kontroly" title="Evidencia kontrol a poistenia"
        steps={[
          'Kliknite "Nová kontrola" a vyberte vozidlo, typ (STK/EK/PZP/Havarijné), dátum a platnosť',
          'Zadajte cenu a označte či je zaplatené',
          'V tabuľke kliknite na "Zaplatené/Nezaplatené" pre rýchlu zmenu stavu platby',
          'Filtrujte podľa typu alebo stavu platby',
          'Hore sa zobrazuje súhrn: celková suma, zaplatené a nezaplatené',
        ]}
      >
        Sledovanie zákonných kontrol a poistenia. Systém automaticky zobrazuje farebné indikátory platnosti.
        Pri nastavení emailových notifikácií vás systém upozorní 30, 14 a 7 dní pred expiráciou.
      </HelpTip>
      <KontrolyTable
        kontroly={(kontrolyResult.data as any) || []}
        vozidla={(vozidlaResult.data as any) || []}
      />
    </div>
  )
}
