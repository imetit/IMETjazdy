import { getHlasenia } from '@/actions/fleet-hlasenia'
import HlaseniaTable from '@/components/fleet/HlaseniaTable'

export default async function FleetHlaseniaPage() {
  const { data, error } = await getHlasenia()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Hlásenia problémov</h1>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <HlaseniaTable hlasenia={(data as any) || []} />
      )}
    </div>
  )
}
