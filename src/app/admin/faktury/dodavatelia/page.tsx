import ModuleHelp from '@/components/ModuleHelp'
import { getDodavatelia } from '@/actions/dodavatelia'
import DodavateliaClient from '@/components/faktury/DodavateliaClient'
import type { Dodavatel } from '@/lib/faktury-types'

export default async function DodavateliaPage() {
  const result = await getDodavatelia()
  const data = 'data' in result ? (result.data as Dodavatel[]) : []
  return (
    <div>
      <ModuleHelp title="Dodávatelia">
        <p>Centrálna evidencia dodávateľov pre faktúry. Pri novej faktúre sa autocompletujú názov, IBAN, default mena a DPH sadzba.</p>
        <p>IČO je unique — nedá sa pridať dodávateľ s rovnakým IČO dvakrát.</p>
      </ModuleHelp>
      <DodavateliaClient initialData={data} />
    </div>
  )
}
