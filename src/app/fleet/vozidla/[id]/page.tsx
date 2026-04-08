import { getVozidloDetail, getVodici, getKmHistoria } from '@/actions/fleet-vozidla'
import { getServisy } from '@/actions/fleet-servisy'
import { getKontroly } from '@/actions/fleet-kontroly'
import { getHlasenia } from '@/actions/fleet-hlasenia'
import { getDokumenty, uploadDokument, deleteDokument } from '@/actions/fleet-dokumenty'
import { getZnamky } from '@/actions/fleet-znamky'
import { getHistoriaDrzitelov, getOdovzdavacieProtokoly } from '@/actions/fleet-historia'
import { redirect } from 'next/navigation'
import VozidloDetail from '@/components/fleet/VozidloDetail'

export default async function VozidloDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [vozidloResult, vodiciResult, servisyResult, kontrolyResult, kmResult, hlaseniaResult, dokumentyResult, znamkyResult, historiaResult, protokolyResult] = await Promise.all([
    getVozidloDetail(id),
    getVodici(),
    getServisy({ vozidloId: id }),
    getKontroly({ vozidloId: id }),
    getKmHistoria(id),
    getHlasenia(),
    getDokumenty(id),
    getZnamky(id),
    getHistoriaDrzitelov(id),
    getOdovzdavacieProtokoly(id),
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
      znamky={(znamkyResult.data as any) || []}
      historia={(historiaResult.data as any) || []}
      protokoly={(protokolyResult.data as any) || []}
      onUploadDokument={uploadDokument}
      onDeleteDokument={deleteDokument}
    />
  )
}
