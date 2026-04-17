import { getServisy } from '@/actions/fleet-servisy'
import { getVozidla } from '@/actions/fleet-vozidla'
import ServisTable from '@/components/fleet/ServisTable'
import ModuleHelp from '@/components/ModuleHelp'

export default async function FleetServisyPage({ searchParams }: { searchParams: Promise<{ vozidlo?: string }> }) {
  const { vozidlo: vozidloFilter } = await searchParams
  const [servisyResult, vozidlaResult] = await Promise.all([
    getServisy(vozidloFilter ? { vozidloId: vozidloFilter } : undefined),
    getVozidla(),
  ])

  return (
    <div>
      <ModuleHelp title="Servisy a opravy">
        <p><strong>Čo tu nájdete:</strong> Evidencia všetkých servisných zásahov na firemných vozidlách.</p>
        <p><strong>"Pridať servis":</strong> Zaznamenajte nový servis — vyberte vozidlo, zadajte dátum, popis prác, cenu, dodávateľa.</p>
        <p><strong>Plánovanie:</strong> Pri servise nastavte interval ďalšieho servisu (podľa km alebo mesiacov). Dashboard upozorní keď sa blíži.</p>
        <p><strong>Typy:</strong> Servis (pravidelná údržba), Porucha (neplánovaná oprava), Nehoda (oprava po nehode), Údržba (sezónna práca).</p>
        <p><strong>Stavy:</strong> Plánované → Prebieha → Dokončené.</p>
        <p><strong>Prílohy:</strong> Nahrajte faktúru alebo servisný protokol.</p>
      </ModuleHelp>
      <h1 className="text-2xl font-bold mb-6">Servisy a opravy</h1>
      <ServisTable
        servisy={(servisyResult.data as any) || []}
        vozidla={(vozidlaResult.data as any) || []}
        defaultVozidloId={vozidloFilter}
      />
    </div>
  )
}
