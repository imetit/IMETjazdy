import { getKontroly } from '@/actions/fleet-kontroly'
import { getVozidla } from '@/actions/fleet-vozidla'
import KontrolyTable from '@/components/fleet/KontrolyTable'
import ModuleHelp from '@/components/ModuleHelp'

export default async function FleetKontrolyPage() {
  const [kontrolyResult, vozidlaResult] = await Promise.all([getKontroly(), getVozidla()])

  return (
    <div>
      <ModuleHelp title="Kontroly STK, EK, PZP, Havarijné">
        <p><strong>Čo tu nájdete:</strong> Evidencia povinných kontrol a poistení všetkých vozidiel.</p>
        <p><strong>"Pridať kontrolu":</strong> Zaznamenajte novú kontrolu — typ (STK/EK/PZP/Havarijné), dátum vykonania, platnosť do, cena.</p>
        <p><strong>Farebné indikátory:</strong> Zelená = platná, Oranžová = expiruje do 30 dní, Červená = expiruje do 7 dní alebo expirovaná.</p>
        <p><strong>Upozornenia:</strong> Systém automaticky upozorňuje na blížiace sa expirácie — 30, 14 a 7 dní vopred na fleet dashboarde.</p>
      </ModuleHelp>
      <h1 className="text-2xl font-bold mb-6">Kontroly — STK / EK / Poistenie</h1>
      <KontrolyTable
        kontroly={(kontrolyResult.data as any) || []}
        vozidla={(vozidlaResult.data as any) || []}
      />
    </div>
  )
}
