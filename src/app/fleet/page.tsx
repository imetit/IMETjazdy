import { getFleetDashboardData } from '@/actions/fleet-dashboard'
import FleetDashboard from '@/components/fleet/FleetDashboard'

export default async function FleetDashboardPage() {
  const { data, error } = await getFleetDashboardData()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Vozový park — Dashboard</h1>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : data ? (
        <FleetDashboard data={data} />
      ) : null}
    </div>
  )
}
