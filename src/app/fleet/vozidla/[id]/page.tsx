import { getVozidloDetail, getVodici, getKmHistoria } from '@/actions/fleet-vozidla'
import { getServisy } from '@/actions/fleet-servisy'
import { getKontroly } from '@/actions/fleet-kontroly'
import { getHlasenia } from '@/actions/fleet-hlasenia'
import { getDokumenty, uploadDokument, deleteDokument } from '@/actions/fleet-dokumenty'
import { redirect } from 'next/navigation'
import VozidloDetail from '@/components/fleet/VozidloDetail'

export default async function VozidloDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [vozidloResult, vodiciResult, servisyResult, kontrolyResult, kmResult, hlaseniaResult, dokumentyResult] = await Promise.all([
    getVozidloDetail(id),
    getVodici(),
    getServisy({ vozidloId: id }),
    getKontroly({ vozidloId: id }),
    getKmHistoria(id),
    getHlasenia(),
    getDokumenty(id),
  ])

  if (vozidloResult.error || !vozidloResult.data) redirect('/fleet/vozidla')

  const vozidloHlasenia = (hlaseniaResult.data || []).filter((h: any) => h.vozidlo_id === id)

  return (
    <VozidloDetail
      vozidlo={vozidloResult.data as any}
      vodici={vodiciResult.data || []}
      dokumenty={(dokumentyResult.data as any) || []}
      servisy={(servisyResult.data as any) || []}
      kontroly={(kontrolyResult.data as any) || []}
      kmHistoria={(kmResult.data as any) || []}
      hlasenia={vozidloHlasenia as any}
      onUploadDokument={uploadDokument}
      onDeleteDokument={deleteDokument}
    />
  )
}
