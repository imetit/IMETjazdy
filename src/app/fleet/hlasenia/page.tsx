import { getHlasenia } from '@/actions/fleet-hlasenia'
import HlaseniaTable from '@/components/fleet/HlaseniaTable'
import ModuleHelp from '@/components/ModuleHelp'

export default async function FleetHlaseniaPage() {
  const { data, error } = await getHlasenia()

  return (
    <div>
      <ModuleHelp title="Hlásenia problémov">
        <p><strong>Čo tu nájdete:</strong> Problémy s vozidlami nahlásené vodičmi/zamestnancami.</p>
        <p><strong>Stavy:</strong> Nové (čaká na riešenie) → Prebieha (fleet manager rieši) → Vyriešené.</p>
        <p><strong>Priority:</strong> Nízka, Normálna, Vysoká, Kritická — určuje zamestnanec pri hlásení.</p>
        <p><strong>Kliknutie na hlásenie:</strong> Otvorí detail kde môžete zmeniť stav, pridať komentár k riešeniu.</p>
        <p><strong>Notifikácie:</strong> Pri novom hlásení dostanete automatickú notifikáciu.</p>
      </ModuleHelp>
      <h1 className="text-2xl font-bold mb-6">Hlásenia problémov</h1>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <HlaseniaTable hlasenia={(data as any) || []} />
      )}
    </div>
  )
}
