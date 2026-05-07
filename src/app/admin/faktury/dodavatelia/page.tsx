import { Suspense } from 'react'
import ModuleHelp from '@/components/ModuleHelp'
import { SkeletonPage } from '@/components/Skeleton'
import { getDodavatelia } from '@/actions/dodavatelia'
import DodavateliaClient from '@/components/faktury/DodavateliaClient'
import type { Dodavatel } from '@/lib/faktury-types'

export default function DodavateliaPage() {
  return (
    <div>
      <ModuleHelp title="Dodávatelia">
        <p>Centrálna evidencia dodávateľov pre faktúry. Pri novej faktúre sa autocompletujú názov, IBAN, default mena a DPH sadzba.</p>
        <p>IČO je unique — nedá sa pridať dodávateľ s rovnakým IČO dvakrát.</p>
      </ModuleHelp>
      <Suspense fallback={<SkeletonPage />}>
        <DodavateliaContent />
      </Suspense>
    </div>
  )
}

async function DodavateliaContent() {
  const result = await getDodavatelia()
  const data = 'data' in result ? (result.data as Dodavatel[]) : []
  return <DodavateliaClient initialData={data} />
}
