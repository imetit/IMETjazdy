import { getKontroly } from '@/actions/fleet-kontroly'
import { getVozidla } from '@/actions/fleet-vozidla'
import KontrolyTable from '@/components/fleet/KontrolyTable'

export default async function FleetKontrolyPage() {
  const [kontrolyResult, vozidlaResult] = await Promise.all([getKontroly(), getVozidla()])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Kontroly — STK / EK / Poistenie</h1>
      <KontrolyTable
        kontroly={(kontrolyResult.data as any) || []}
        vozidla={(vozidlaResult.data as any) || []}
      />
    </div>
  )
}
