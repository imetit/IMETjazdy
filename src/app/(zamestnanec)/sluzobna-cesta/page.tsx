// src/app/(zamestnanec)/sluzobna-cesta/page.tsx
import { getMyCesty } from '@/actions/sluzobne-cesty'
import SluzobnasCestaForm from '@/components/cesty/SluzobnasCestaForm'
import ModuleHelp from '@/components/ModuleHelp'
import type { SluzobnasCesta } from '@/lib/cesty-types'

export default async function SluzobnasCestaPage() {
  const result = await getMyCesty()
  return (
    <div>
      <ModuleHelp title="Moje služobné cesty">
        <p><strong>Čo tu nájdete:</strong> Vaše služobné cesty — žiadosti, schválené cesty, nahrávanie dokladov.</p>
        <p><strong>"Nová žiadosť":</strong> Podajte žiadosť o služobnú cestu — dátumy, trasa, typ (domáca/zahraničná), doprava, účel.</p>
        <p><strong>Po návrate:</strong> Otvorte schválenú cestu a nahrajte doklady (hotel, cestovné, účtenky).</p>
        <p><strong>Schvaľovanie:</strong> Žiadosť ide vášmu nadriadenému. Ak je na dovolenke, schvaľuje zastupujúci.</p>
      </ModuleHelp>
      <SluzobnasCestaForm cesty={(result.data as SluzobnasCesta[]) || []} />
    </div>
  )
}
