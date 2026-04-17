import { getFleetDashboardData } from '@/actions/fleet-dashboard'
import FleetDashboard from '@/components/fleet/FleetDashboard'
import ModuleHelp from '@/components/ModuleHelp'

export default async function FleetDashboardPage() {
  const { data, error } = await getFleetDashboardData()

  return (
    <div>
      <ModuleHelp title="Fleet Dashboard">
        <p><strong>Čo tu nájdete:</strong> Prehľad celého vozového parku — počty vozidiel, blížiace sa kontroly, plánované servisy, nové hlásenia.</p>
        <p><strong>Štatistiky:</strong> Celkový počet vozidiel rozdelený podľa stavu (aktívne / v servise / vyradené).</p>
        <p><strong>Blížiace sa kontroly:</strong> Vozidlá s STK, EK, PZP alebo havarijným blížiacim sa k expirácii. Červená = menej ako 7 dní, oranžová = menej ako 30 dní.</p>
        <p><strong>Blížiace sa servisy:</strong> Vozidlá kde sa blíži plánovaný dátum servisu.</p>
        <p><strong>Kliknutie na kartu:</strong> Presmeruje na príslušný zoznam s filtrom.</p>
      </ModuleHelp>
      <h1 className="text-2xl font-bold mb-6">Vozový park — Dashboard</h1>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : data ? (
        <FleetDashboard data={data} />
      ) : null}
    </div>
  )
}
