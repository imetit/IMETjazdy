// src/app/admin/archiv/page.tsx
import { getAllDokumenty } from '@/actions/archiv'
import { getKategorie } from '@/actions/archiv-kategorie'
import ArchivPageClient from '@/components/archiv/ArchivPageClient'
import type { DokumentArchiv, ArchivKategoria } from '@/lib/archiv-types'

export default async function AdminArchivPage({ searchParams }: { searchParams: Promise<{ kategoria?: string }> }) {
  const params = await searchParams
  const kategoriaId = params.kategoria || undefined

  const [dokumentyResult, kategorieResult] = await Promise.all([
    getAllDokumenty(kategoriaId ? { kategoria_id: kategoriaId } : undefined),
    getKategorie(),
  ])

  const dokumenty = (dokumentyResult.data as DokumentArchiv[]) || []
  const kategorie = (kategorieResult.data as ArchivKategoria[]) || []

  // Count documents per category (from all documents, not filtered)
  const allDocsResult = kategoriaId ? await getAllDokumenty() : dokumentyResult
  const allDocs = (allDocsResult.data as DokumentArchiv[]) || []
  const counts: Record<string, number> = {}
  for (const doc of allDocs) {
    if (doc.kategoria_id) {
      counts[doc.kategoria_id] = (counts[doc.kategoria_id] || 0) + 1
    }
  }

  return (
    <ArchivPageClient
      dokumenty={dokumenty}
      kategorie={kategorie}
      counts={counts}
      selectedKategoria={kategoriaId || null}
    />
  )
}
