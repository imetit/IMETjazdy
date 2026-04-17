// src/app/admin/dovolenky/page.tsx
import { getDovolenkyNaSchvalenie } from '@/actions/dovolenky'
import DovolenkySchvalovanie from '@/components/dochadzka/DovolenkySchvalovanie'
import ModuleHelp from '@/components/ModuleHelp'
import type { Dovolenka } from '@/lib/dovolenka-types'

export default async function AdminDovolenkyPage() {
  const result = await getDovolenkyNaSchvalenie()
  return (
    <div>
      <ModuleHelp title="Schvaľovanie dovoleniek">
        <p><strong>Čo tu nájdete:</strong> Žiadosti o dovolenku čakajúce na schválenie.</p>
        <p><strong>&quot;Schváliť&quot;:</strong> Schváli žiadosť — zamestnanec dostane notifikáciu, dovolenka sa započíta do dochádzky.</p>
        <p><strong>&quot;Zamietnuť&quot;:</strong> Zamietne žiadosť s dôvodom — zamestnanec dostane notifikáciu.</p>
        <p><strong>Typy voľna:</strong> Dovolenka, PN, OČR, Náhradné voľno, Neplatené voľno. Pol dňa = 0,5 dňa (dopoludnie/popoludnie).</p>
        <p><strong>Logika:</strong> Žiadosť ide priamemu nadriadenému. Ak je na dovolenke → automaticky zastupujúcemu. Self-approval blokovaný.</p>
      </ModuleHelp>
      <DovolenkySchvalovanie dovolenky={(result.data as Dovolenka[]) || []} />
    </div>
  )
}
