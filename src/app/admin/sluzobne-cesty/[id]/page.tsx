// src/app/admin/sluzobne-cesty/[id]/page.tsx
import { getCestaDetail, getCestaDoklady } from '@/actions/sluzobne-cesty'
import SluzobnasCestaDetail from '@/components/cesty/SluzobnasCestaDetail'
import ModuleHelp from '@/components/ModuleHelp'
import FakturyForEntityPanel from '@/components/faktury/FakturyForEntityPanel'
import { redirect } from 'next/navigation'
import type { SluzobnasCesta, CestovnyPrikaz } from '@/lib/cesty-types'

export default async function AdminCestaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [result, dokladyResult] = await Promise.all([
    getCestaDetail(id),
    getCestaDoklady(id),
  ])
  if (!result.cesta) redirect('/admin/sluzobne-cesty')

  return (
    <div>
      <ModuleHelp title="Detail služobnej cesty">
        <p><strong>Čo tu nájdete:</strong> Kompletné údaje o ceste — dátumy, trasa, typ, doklady, vyúčtovanie.</p>
        <p><strong>"Schváliť" / "Zamietnuť":</strong> Rozhodnite o žiadosti o služobnú cestu.</p>
        <p><strong>Doklady:</strong> Po návrate zamestnanca skontrolujte nahrané doklady (hotel, cestovné, stravné). Každý schváľte alebo zamietnite.</p>
        <p><strong>Vyúčtovanie:</strong> Systém vypočíta: diéty (podľa hodín a krajiny) + schválené doklady - preddavok = výsledok. Kladný = doplatok zamestnancovi, záporný = vracia.</p>
        <p><strong>Stav vyúčtovania:</strong> Čaká na doklady → Vyúčtované → Uzavreté.</p>
      </ModuleHelp>
      <SluzobnasCestaDetail
        cesta={result.cesta as SluzobnasCesta}
        prikaz={(result.prikaz as CestovnyPrikaz) || null}
        doklady={dokladyResult.data}
      />
      <div className="mt-6">
        <FakturyForEntityPanel entity="cesta_id" entityId={id} title="Faktúry naviazané na cestu" />
      </div>
    </div>
  )
}
