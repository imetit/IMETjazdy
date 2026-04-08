import { getFleetDashboardData } from '@/actions/fleet-dashboard'
import FleetDashboard from '@/components/fleet/FleetDashboard'
import HelpTip from '@/components/HelpTip'

export default async function FleetDashboardPage() {
  const { data, error } = await getFleetDashboardData()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Vozový park — Dashboard</h1>
      <HelpTip id="fleet-dashboard" title="Prehľad vozového parku">
        Dashboard zobrazuje celkový stav vozového parku. Kliknite na karty pre detail. <strong>V servise</strong> — rozbalí detaily opráv.
        <strong> Poistenie</strong> — prehľad PZP a havarijného s platnosťou a stavom platby.
        <strong> Blížiace sa kontroly</strong> — STK/EK s platnosťou do 30 dní. Farebné indikátory: zelená = OK, oranžová = blíži sa, červená = expirované.
      </HelpTip>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : data ? (
        <FleetDashboard data={data} />
      ) : null}
    </div>
  )
}
