import { getFleetCostReport, getDriverKmReport } from '@/actions/fleet-reporty'
import FleetReporty from '@/components/fleet/FleetReporty'
import HelpTip from '@/components/HelpTip'

export default async function FleetReportyPage() {
  const [costResult, driverResult] = await Promise.all([
    getFleetCostReport(),
    getDriverKmReport(),
  ])

  const error = costResult.error || driverResult.error

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Fleet reporty</h1>
      <HelpTip id="fleet-reporty" title="Reporty vozového parku">
        Prehľad nákladov na vozidlá (servisy, kontroly, cena za km) a štatistiky kilometrov vodičov.
        Dáta je možné triediť kliknutím na hlavičku stĺpca a exportovať do CSV.
      </HelpTip>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <FleetReporty
          costData={costResult.data ?? []}
          driverData={driverResult.data ?? []}
        />
      )}
    </div>
  )
}
