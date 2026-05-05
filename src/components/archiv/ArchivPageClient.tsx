// src/components/archiv/ArchivPageClient.tsx
'use client'

import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import type { DokumentArchiv, ArchivKategoria } from '@/lib/archiv-types'
import ArchivTable from './ArchivTable'
import KategorieSidebar from './KategorieSidebar'

interface Props {
  dokumenty: DokumentArchiv[]
  kategorie: ArchivKategoria[]
  counts: Record<string, number>
  selectedKategoria: string | null
}

export default function ArchivPageClient({
  dokumenty: initialDokumenty,
  kategorie: initialKategorie,
  counts: initialCounts,
  selectedKategoria,
}: Props) {
  const router = useRouter()
  const swrKey = `/api/admin/archiv${selectedKategoria ? `?kategoria=${selectedKategoria}` : ''}`
  const { data } = useSWR<{ dokumenty: DokumentArchiv[]; kategorie: ArchivKategoria[]; counts: Record<string, number> }>(
    swrKey,
    { fallbackData: { dokumenty: initialDokumenty, kategorie: initialKategorie, counts: initialCounts } },
  )
  const dokumenty = data?.dokumenty || initialDokumenty
  const kategorie = data?.kategorie || initialKategorie
  const counts = data?.counts || initialCounts

  function handleSelectKategoria(id: string | null) {
    if (id) {
      router.push(`/admin/archiv?kategoria=${id}`)
    } else {
      router.push('/admin/archiv')
    }
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <KategorieSidebar
          kategorie={kategorie}
          selected={selectedKategoria}
          onSelect={handleSelectKategoria}
          counts={counts}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <ArchivTable dokumenty={dokumenty} />
      </div>
    </div>
  )
}
