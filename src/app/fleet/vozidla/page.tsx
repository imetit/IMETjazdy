import { getVozidla, getVodici } from '@/actions/fleet-vozidla'
import FleetVozidlaTable from '@/components/fleet/FleetVozidlaTable'
import ModuleHelp from '@/components/ModuleHelp'

export default async function FleetVozidlaPage() {
  const [vozidlaResult, vodiciResult] = await Promise.all([getVozidla(), getVodici()])

  return (
    <div>
      <ModuleHelp title="Vozidlá">
        <p><strong>Čo tu nájdete:</strong> Zoznam všetkých firemných vozidiel s filtrom podľa stavu.</p>
        <p><strong>"Pridať vozidlo":</strong> Vytvorí nové vozidlo — zadajte značku, model, ŠPZ, VIN, rok výroby, typ paliva, spotrebu.</p>
        <p><strong>Kliknutie na riadok:</strong> Otvorí detail vozidla so všetkými 13 tabmi (údaje, dokumenty, servisy, kontroly, km, hlásenia, známky, história, protokoly, vodiči, tachometer, tankovanie, tankové karty).</p>
        <p><strong>Stavy:</strong> Aktívne (v prevádzke), V servise (dočasne odstavené), Vyradené (trvalo vyradené).</p>
      </ModuleHelp>
      <h1 className="text-2xl font-bold mb-6">Vozidlá</h1>
      {vozidlaResult.error ? (
        <p className="text-red-500">{vozidlaResult.error}</p>
      ) : (
        <FleetVozidlaTable vozidla={vozidlaResult.data as any} vodici={vodiciResult.data || []} />
      )}
    </div>
  )
}
