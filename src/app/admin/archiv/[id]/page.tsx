// src/app/admin/archiv/[id]/page.tsx
import { getDokument } from '@/actions/archiv'
import { createSupabaseServer } from '@/lib/supabase-server'
import ArchivDetail from '@/components/archiv/ArchivDetail'
import { redirect } from 'next/navigation'
import type { DokumentArchiv } from '@/lib/archiv-types'

export default async function AdminArchivDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getDokument(id)
  if (result.error || !result.data) redirect('/admin/archiv')

  const supabase = await createSupabaseServer()
  const { data: urlData } = await supabase.storage
    .from('archiv')
    .createSignedUrl(result.data.file_path, 3600)

  return (
    <ArchivDetail
      dokument={result.data as DokumentArchiv}
      downloadUrl={urlData?.signedUrl || '#'}
    />
  )
}
