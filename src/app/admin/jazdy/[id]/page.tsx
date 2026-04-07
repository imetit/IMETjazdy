import { createSupabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Eye } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import VyuctovaniePanel from '@/components/VyuctovaniePanel'
import JazdaEditForm from '@/components/JazdaEditForm'
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

  const employeeName = jazda.profile?.full_name || ''

  return (
    <div>
      <Link href="/admin/jazdy" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft size={16} /> Späť na zoznam</Link>
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Detail jazdy</h2>
        <StatusBadge stav={jazda.stav as JazdaStav} />
        {jazda.profile && <span className="text-sm text-gray-500">— {employeeName} ({jazda.profile.email})</span>}
      </div>

      {/* Editable trip info */}
      <JazdaEditForm jazda={jazda as Jazda} />

      {/* Attachments with download */}
      {prilohyWithUrls.length > 0 && (
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Bločky / Prílohy ({prilohyWithUrls.length})</h3>
          <div className="space-y-2">
            {prilohyWithUrls.map((p) => {
              const isImage = /\.(jpg|jpeg|png)$/i.test(p.file_name)
              return (
                <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="flex-1 truncate font-medium">{p.file_name}</span>
                  <span className="text-gray-400 text-xs">{(p.file_size / 1024).toFixed(0)} KB</span>
                  {isImage && p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors" title="Zobraziť">
                      <Eye size={16} />
                    </a>
                  )}
                  {p.url && (
                    <a href={p.url} download={p.file_name} className="text-gray-400 hover:text-primary transition-colors" title="Stiahnuť">
                      <Download size={16} />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reimbursement panel with print/PDF */}
      <VyuctovaniePanel
        jazda={jazda as Jazda}
        vozidlo={jazda.vozidlo as Vozidlo}
        paliva={paliva as Paliva}
        settings={settings as Settings}
        employeeName={employeeName}
      />
    </div>
  )
}
