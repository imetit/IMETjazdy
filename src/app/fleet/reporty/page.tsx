import { getFleetCostReport, getDriverKmReport } from '@/actions/fleet-reporty'
import FleetReporty from '@/components/fleet/FleetReporty'
import ModuleHelp from '@/components/ModuleHelp'
import { createSupabaseServer } from '@/lib/supabase-server'

export default async function FleetReportyPage() {
  const supabase = await createSupabaseServer()
  const [costResult, driverResult, vozidlaResult] = await Promise.all([
    getFleetCostReport(),
    getDriverKmReport(),
    supabase.from('vozidla').select('id, spz, znacka, variant').neq('stav', 'vyradene').order('spz'),
  ])

  const error = costResult.error || driverResult.error

  return (
    <div>
      <ModuleHelp title="Fleet Reporty">
        <p><strong>Čo tu nájdete:</strong> Analytické prehľady o vozovom parku — náklady, km, spotreba.</p>
        <p><strong>Náklady per vozidlo:</strong> Vyberte vozidlo a rok → zobrazí sa rozdelenie nákladov: servisy, tankovanie, kontroly (STK/EK), poistné udalosti (spoluúčasť). Celkový súčet = TCO vozidla.</p>
        <p><strong>KM vodičov:</strong> Najazdené kilometre per vodič za obdobie.</p>
        <p><strong>Export:</strong> Dáta môžete exportovať do CSV.</p>
      </ModuleHelp>
      <h1 className="text-2xl font-bold mb-6">Fleet reporty</h1>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <FleetReporty
          costData={costResult.data ?? []}
          driverData={driverResult.data ?? []}
          vozidla={vozidlaResult.data ?? []}
        />
      )}
    </div>
  )
}
