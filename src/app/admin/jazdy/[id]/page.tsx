import { createSupabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import VyuctovaniePanel from '@/components/VyuctovaniePanel'
import type { Jazda, Vozidlo, Paliva, Settings, JazdaStav, JazdaPriloha } from '@/lib/types'

export default async function AdminJazdaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data: jazda } = await supabase.from('jazdy').select('*, profile:profiles(full_name, email), vozidlo:vozidla(*), prilohy:jazdy_prilohy(*)').eq('id', id).single()
  if (!jazda) notFound()

  const { data: paliva } = await supabase.from('paliva').select('*').single()
  const { data: settings } = await supabase.from('settings').select('*').single()

  const prilohy = (jazda.prilohy || []) as JazdaPriloha[]
  const prilohyWithUrls = await Promise.all(
    prilohy.map(async (p) => {
      const { data } = await supabase.storage.from('blocky').createSignedUrl(p.file_path, 3600)
      return { ...p, url: data?.signedUrl || '' }
    })
  )

  return (
    <div>
      <Link href="/admin/jazdy" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft size={16} /> Späť na zoznam</Link>
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Detail jazdy</h2>
        <StatusBadge stav={jazda.stav as JazdaStav} />
      </div>

      <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          <div><span className="text-gray-500">Zamestnanec:</span> <span className="font-medium">{jazda.profile?.full_name}</span></div>
          <div><span className="text-gray-500">Mesiac:</span> <span>{jazda.mesiac}</span></div>
          <div><span className="text-gray-500">Odchod z:</span> <span>{jazda.odchod_z}</span></div>
          <div><span className="text-gray-500">Príchod do:</span> <span>{jazda.prichod_do}</span></div>
          <div><span className="text-gray-500">Cez:</span> <span>{jazda.cez || '-'}</span></div>
          <div><span className="text-gray-500">KM:</span> <span className="font-semibold">{jazda.km}</span></div>
          <div><span className="text-gray-500">Čas odchodu:</span> <span>{jazda.cas_odchodu}</span></div>
          <div><span className="text-gray-500">Čas príchodu:</span> <span>{jazda.cas_prichodu}</span></div>
        </div>
        {jazda.komentar && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <span className="font-medium">Komentár pri vrátení:</span> {jazda.komentar}
          </div>
        )}
      </div>

      {prilohyWithUrls.length > 0 && (
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Bločky / Prílohy</h3>
          <div className="space-y-2">
            {prilohyWithUrls.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition-colors">
                <Download size={16} className="text-gray-400" />
                <span className="flex-1">{p.file_name}</span>
                <span className="text-gray-400 text-xs">{(p.file_size / 1024).toFixed(0)} KB</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <VyuctovaniePanel jazda={jazda as Jazda} vozidlo={jazda.vozidlo as Vozidlo} paliva={paliva as Paliva} settings={settings as Settings} />
    </div>
  )
}
