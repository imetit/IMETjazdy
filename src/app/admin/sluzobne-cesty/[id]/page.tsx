// src/app/admin/sluzobne-cesty/[id]/page.tsx
import { getCestaDetail, getCestaDoklady } from '@/actions/sluzobne-cesty'
import SluzobnasCestaDetail from '@/components/cesty/SluzobnasCestaDetail'
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
    <SluzobnasCestaDetail
      cesta={result.cesta as SluzobnasCesta}
      prikaz={(result.prikaz as CestovnyPrikaz) || null}
      doklady={dokladyResult.data}
    />
  )
}
