// src/components/archiv/ArchivDetail.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Download, Trash2, Upload, AlertTriangle, Clock, History } from 'lucide-react'
import Link from 'next/link'
import type { DokumentArchiv, StavDokumentuArchiv } from '@/lib/archiv-types'
import { TYP_DOKUMENTU_ARCHIV_LABELS, STAV_DOKUMENTU_ARCHIV_LABELS, STAV_DOKUMENTU_ARCHIV_COLORS } from '@/lib/archiv-types'
import { updateDokumentStav, deleteDokumentArchiv, getDocumentVersions, uploadNewVersion } from '@/actions/archiv'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

interface Props {
  dokument: DokumentArchiv
  downloadUrl: string
}

const WORKFLOW_TRANSITIONS: Record<string, { label: string; nextStav: StavDokumentuArchiv; color: string }[]> = {
  nahrany: [
    { label: 'Poslať na schválenie', nextStav: 'caka_na_schvalenie', color: 'bg-orange-600 hover:bg-orange-700' },
  ],
  caka_na_schvalenie: [
    { label: 'Schváliť', nextStav: 'schvaleny', color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Zamietnuť', nextStav: 'zamietnuty', color: 'bg-red-600 hover:bg-red-700' },
  ],
  schvaleny: [
    { label: 'Na úhradu', nextStav: 'na_uhradu', color: 'bg-blue-600 hover:bg-blue-700' },
  ],
  na_uhradu: [
    { label: 'Uhradená', nextStav: 'uhradeny', color: 'bg-teal-600 hover:bg-teal-700' },
  ],
}

export default function ArchivDetail({ dokument, downloadUrl }: Props) {
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [showVersionUpload, setShowVersionUpload] = useState(false)
  const [versionLoading, setVersionLoading] = useState(false)
  const versionFileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const toast = useToast()

  useEffect(() => {
    getDocumentVersions(dokument.id).then(res => {
      if (res.data && res.data.length > 1) setVersions(res.data)
    })
  }, [dokument.id])

  async function handleVersionUpload() {
    const file = versionFileRef.current?.files?.[0]
    if (!file) return
    setVersionLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadNewVersion(dokument.id, formData)
    setVersionLoading(false)
    if (result && 'error' in result) {
      toast.error(result.error ?? 'Chyba pri nahrávaní verzie')
    } else {
      setShowVersionUpload(false)
      router.refresh()
    }
  }

  // Compute expiry info
  const platnostDo = dokument.platnost_do ? new Date(dokument.platnost_do) : null
  const daysUntilExpiry = platnostDo ? Math.ceil((platnostDo.getTime() - Date.now()) / 86400000) : null

  async function handleStavChange(stav: StavDokumentuArchiv) {
    setLoading(true)
    await updateDokumentStav(dokument.id, stav)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Naozaj chcete zmazať tento dokument?')) return
    await deleteDokumentArchiv(dokument.id, dokument.file_path)
    router.push('/admin/archiv')
  }

  const transitions = WORKFLOW_TRANSITIONS[dokument.stav] || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/archiv" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold">{dokument.nazov}</h1>
            <p className="text-gray-500">{TYP_DOKUMENTU_ARCHIV_LABELS[dokument.typ]} · {formatDate(dokument.created_at)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STAV_DOKUMENTU_ARCHIV_COLORS[dokument.stav]}`}>
            {STAV_DOKUMENTU_ARCHIV_LABELS[dokument.stav]}
          </span>
        </div>
        <div className="flex gap-2">
          <a href={downloadUrl} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
            <Download size={16} /> Stiahnuť
          </a>
          <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium">
            <Trash2 size={16} /> Zmazať
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {dokument.dodavatel && <div><span className="text-gray-500">Dodávateľ:</span> <span className="font-medium">{dokument.dodavatel}</span></div>}
          {dokument.cislo_faktury && <div><span className="text-gray-500">Číslo faktúry:</span> <span className="font-medium">{dokument.cislo_faktury}</span></div>}
          {dokument.suma && <div><span className="text-gray-500">Suma:</span> <span className="font-medium">{formatCurrency(dokument.suma)}</span></div>}
          {dokument.datum_splatnosti && <div><span className="text-gray-500">Splatnosť:</span> <span className="font-medium">{formatDate(dokument.datum_splatnosti)}</span></div>}
          {dokument.oddelenie && <div><span className="text-gray-500">Oddelenie:</span> <span className="font-medium">{dokument.oddelenie}</span></div>}
          <div><span className="text-gray-500">Nahral:</span> <span className="font-medium">{(dokument as any).nahral?.full_name || '—'}</span></div>
          {dokument.popis && <div className="col-span-2"><span className="text-gray-500">Popis:</span> <span>{dokument.popis}</span></div>}
          {dokument.tagy && dokument.tagy.length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-500">Tagy:</span>{' '}
              {dokument.tagy.map((t, i) => (
                <span key={i} className="inline-block px-2 py-0.5 bg-gray-100 rounded-full text-xs mr-1">{t}</span>
              ))}
            </div>
          )}
          <div><span className="text-gray-500">Veľkosť:</span> <span>{dokument.file_size ? `${(dokument.file_size / 1024).toFixed(0)} KB` : '—'}</span></div>
        </div>
      </div>

      {/* Platnost do */}
      {platnostDo && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${
          daysUntilExpiry !== null && daysUntilExpiry <= 0 ? 'border-red-300 bg-red-50' :
          daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'border-red-200 bg-red-50' :
          daysUntilExpiry !== null && daysUntilExpiry <= 30 ? 'border-orange-200 bg-orange-50' :
          'border-gray-200 bg-white'
        }`}>
          <Clock size={18} className={
            daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-red-500' :
            daysUntilExpiry !== null && daysUntilExpiry <= 30 ? 'text-orange-500' :
            'text-gray-400'
          } />
          <div>
            <span className="text-sm font-medium">Platnosť do: {platnostDo.toLocaleDateString('sk-SK')}</span>
            {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-semibold">EXPIROVANÉ</span>
            )}
            {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                daysUntilExpiry <= 7 ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
              }`}>
                {daysUntilExpiry} {daysUntilExpiry === 1 ? 'deň' : daysUntilExpiry <= 4 ? 'dni' : 'dní'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Workflow buttons */}
      {transitions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Zmeniť stav</h3>
          <div className="flex gap-3">
            {transitions.map(t => (
              <button
                key={t.nextStav}
                onClick={() => handleStavChange(t.nextStav)}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${t.color}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Version history */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-gray-400" />
            <h3 className="text-lg font-semibold">História verzií</h3>
          </div>
          <button
            onClick={() => setShowVersionUpload(!showVersionUpload)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            <Upload size={14} /> Nahrať novú verziu
          </button>
        </div>

        {showVersionUpload && (
          <div className="mb-4 p-4 border border-dashed border-gray-300 rounded-lg flex items-center gap-3">
            <input
              ref={versionFileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              className="text-sm"
            />
            <button
              onClick={handleVersionUpload}
              disabled={versionLoading}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {versionLoading ? 'Nahrávam...' : 'Nahrať'}
            </button>
          </div>
        )}

        {versions.length > 0 ? (
          <div className="space-y-2">
            {versions.map((v: any) => (
              <div
                key={v.id}
                className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                  v.id === dokument.id ? 'bg-primary/5 border border-primary/20' : 'bg-gray-50'
                }`}
              >
                <div>
                  <span className="font-medium">Verzia {v.verzia || 1}</span>
                  <span className="text-gray-500 ml-2">{formatDate(v.created_at)}</span>
                  <span className="text-gray-400 ml-2">{v.nahral?.full_name || '—'}</span>
                  {v.id === dokument.id && (
                    <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">aktuálna</span>
                  )}
                </div>
                <Link
                  href={`/admin/archiv/${v.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {v.id === dokument.id ? 'Zobrazená' : 'Zobraziť'}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Tento dokument má len jednu verziu.</p>
        )}
      </div>
    </div>
  )
}
