import { getVozidla, getVodici } from '@/actions/fleet-vozidla'
import FleetVozidlaTable from '@/components/fleet/FleetVozidlaTable'

export default async function FleetVozidlaPage() {
  const [vozidlaResult, vodiciResult] = await Promise.all([getVozidla(), getVodici()])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Vozidlá</h1>
      {vozidlaResult.error ? (
        <p className="text-red-500">{vozidlaResult.error}</p>
      ) : (
        <FleetVozidlaTable vozidla={vozidlaResult.data as any} vodici={vodiciResult.data || []} />
      )}
    </div>
  )
}
