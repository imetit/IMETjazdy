import { getServisy } from '@/actions/fleet-servisy'
import { getVozidla } from '@/actions/fleet-vozidla'
import ServisTable from '@/components/fleet/ServisTable'

export default async function FleetServisyPage({ searchParams }: { searchParams: Promise<{ vozidlo?: string }> }) {
  const { vozidlo: vozidloFilter } = await searchParams
  const [servisyResult, vozidlaResult] = await Promise.all([
    getServisy(vozidloFilter ? { vozidloId: vozidloFilter } : undefined),
    getVozidla(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Servisy a opravy</h1>
      <ServisTable
        servisy={(servisyResult.data as any) || []}
        vozidla={(vozidlaResult.data as any) || []}
        defaultVozidloId={vozidloFilter}
      />
    </div>
  )
}
