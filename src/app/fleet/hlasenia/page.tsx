import { getHlasenia } from '@/actions/fleet-hlasenia'
import HlaseniaTable from '@/components/fleet/HlaseniaTable'
import HelpTip from '@/components/HelpTip'

export default async function FleetHlaseniaPage() {
  const { data, error } = await getHlasenia()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Hlásenia problémov</h1>
      <HelpTip id="fleet-hlasenia" title="Spracovanie hlásení od vodičov"
        steps={[
          'Vodič nahlási problém cez "Nahlásiť problém" — zobrazí sa tu so stavom "Nové"',
          'Kliknite "Spracovať" pre otvorenie detailu',
          'Zmeňte stav na "Prebieha" keď začnete riešiť',
          'Vyplňte cenu opravy, dodávateľa (kde sa to robilo) a popis riešenia',
          'Po vyriešení zmeňte stav na "Vyriešené" a uložte',
        ]}
      >
        Zamestnanci môžu nahlásiť problémy so svojimi vozidlami. Každé hlásenie má prioritu (nízka až kritická).
        Pri spracovaní zadáte cenu, dodávateľa a popis opravy — vytvára sa tak kompletná história nákladov na vozidlo.
      </HelpTip>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <HlaseniaTable hlasenia={(data as any) || []} />
      )}
    </div>
  )
}
