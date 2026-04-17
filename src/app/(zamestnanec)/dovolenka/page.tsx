// src/app/(zamestnanec)/dovolenka/page.tsx
import { getMyDovolenky, getMyDovolenkaNarok } from '@/actions/dovolenky'
import DovolenkaForm from '@/components/dochadzka/DovolenkaForm'
import ModuleHelp from '@/components/ModuleHelp'
import type { Dovolenka } from '@/lib/dovolenka-types'

export default async function DovolenkaPage() {
  const [dovolenkyResult, narokResult] = await Promise.all([
    getMyDovolenky(),
    getMyDovolenkaNarok(),
  ])

  return (
    <div>
      <ModuleHelp title="Moja dovolenka">
        <p><strong>Čo tu nájdete:</strong> Prehľad vašich dovoleniek — čerpaná, zostávajúca, žiadosti.</p>
        <p><strong>&quot;Nová žiadosť&quot;:</strong> Podajte žiadosť o voľno — vyberte typ (dovolenka/PN/OČR/náhradné/neplatené), dátumy, voliteľne pol dňa.</p>
        <p><strong>Nárok:</strong> Automaticky 20 dní/rok (25 dní ak máte 33+). Zostatok sa zobrazuje hore.</p>
        <p><strong>Stavy:</strong> Čaká na schválenie → Schválená / Zamietnutá.</p>
        <p><strong>Schvaľovanie:</strong> Žiadosť ide nadriadenému. Ak je na dovolenke, schvaľuje zastupujúci.</p>
      </ModuleHelp>
      <DovolenkaForm
        dovolenky={(dovolenkyResult.data as Dovolenka[]) || []}
        narok={narokResult.data || { narok: 20, cerpane: 0, zostatok: 20 }}
      />
    </div>
  )
}
