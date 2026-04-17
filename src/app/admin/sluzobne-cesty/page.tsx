// src/app/admin/sluzobne-cesty/page.tsx
import { getAllCesty } from '@/actions/sluzobne-cesty'
import SluzobnesCestyTable from '@/components/cesty/SluzobnesCestyTable'
import ModuleHelp from '@/components/ModuleHelp'
import type { SluzobnasCesta } from '@/lib/cesty-types'

export default async function AdminSluzobnesCestyPage() {
  const result = await getAllCesty()
  return (
    <div>
      <ModuleHelp title="Služobné cesty — Prehľad">
        <p><strong>Čo tu nájdete:</strong> Zoznam všetkých služobných ciest — čakajúce na schválenie, schválené, zamietnuté.</p>
        <p><strong>Kliknutie na riadok:</strong> Otvorí detail cesty kde môžete schváliť/zamietnuť, skontrolovať doklady a urobiť vyúčtovanie.</p>
        <p><strong>Stavy:</strong> Nová (čaká na schválenie), Schválená (zamestnanec cestuje), Zamietnutá, Dokončená (vyúčtovaná).</p>
      </ModuleHelp>
      <SluzobnesCestyTable cesty={(result.data as SluzobnasCesta[]) || []} />
    </div>
  )
}
