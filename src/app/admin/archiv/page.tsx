// src/app/admin/archiv/page.tsx
import { getAllDokumenty } from '@/actions/archiv'
import { getKategorie } from '@/actions/archiv-kategorie'
import ArchivPageClient from '@/components/archiv/ArchivPageClient'
import ModuleHelp from '@/components/ModuleHelp'
import type { DokumentArchiv, ArchivKategoria } from '@/lib/archiv-types'

export default async function AdminArchivPage({ searchParams }: { searchParams: Promise<{ kategoria?: string }> }) {
  const params = await searchParams
  const kategoriaId = params.kategoria || undefined

  // Paralelne — bez duplikátnych queries; counts sa robí súčasne s filtrovaným fetch
  const [dokumentyResult, kategorieResult, allDocsResult] = await Promise.all([
    getAllDokumenty(kategoriaId ? { kategoria_id: kategoriaId } : undefined),
    getKategorie(),
    kategoriaId ? getAllDokumenty() : Promise.resolve(null),
  ])

  const dokumenty = (dokumentyResult.data as DokumentArchiv[]) || []
  const kategorie = (kategorieResult.data as ArchivKategoria[]) || []
  const allDocs = (allDocsResult?.data ?? dokumentyResult.data) as DokumentArchiv[] || []

  const counts: Record<string, number> = {}
  for (const doc of allDocs) {
    if (doc.kategoria_id) {
      counts[doc.kategoria_id] = (counts[doc.kategoria_id] || 0) + 1
    }
  }

  return (
    <div>
      <ModuleHelp title="Archív dokumentov">
        <p><strong>Čo tu nájdete:</strong> Centrálne úložisko firemných dokumentov s kategóriami a workflow.</p>
        <p><strong>Kategórie (ľavý panel):</strong> Kliknite na kategóriu pre filtrovanie dokumentov. "Všetky" zobrazí všetko.</p>
        <p><strong>"Nahrať dokument":</strong> Nahrajte nový dokument — vyberte súbor, kategóriu, typ, zadajte metadata.</p>
        <p><strong>Hľadanie:</strong> Fulltextové vyhľadávanie v názvoch a popisoch dokumentov.</p>
        <p><strong>Stav dokumentu:</strong> Nahraný → Schválený / Zamietnutý. Pre faktúry: → Na úhradu → Uhradený.</p>
        <p><strong>Kliknutie na riadok:</strong> Otvorí detail s verziami, schvaľovaním a stiahnutím súboru.</p>
      </ModuleHelp>
      <ArchivPageClient
        dokumenty={dokumenty}
        kategorie={kategorie}
        counts={counts}
        selectedKategoria={kategoriaId || null}
      />
    </div>
  )
}
