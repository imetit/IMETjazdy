// src/app/admin/archiv/page.tsx
import { getAllDokumenty } from '@/actions/archiv'
import ArchivTable from '@/components/archiv/ArchivTable'
import type { DokumentArchiv } from '@/lib/archiv-types'

export default async function AdminArchivPage() {
  const result = await getAllDokumenty()
  return <ArchivTable dokumenty={(result.data as DokumentArchiv[]) || []} />
}
