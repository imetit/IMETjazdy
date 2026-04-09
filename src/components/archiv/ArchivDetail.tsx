// src/components/archiv/ArchivDetail.tsx
'use client'

import { useState } from 'react'
import { ArrowLeft, Download, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { DokumentArchiv, StavDokumentuArchiv } from '@/lib/archiv-types'
import { TYP_DOKUMENTU_ARCHIV_LABELS, STAV_DOKUMENTU_ARCHIV_LABELS, STAV_DOKUMENTU_ARCHIV_COLORS } from '@/lib/archiv-types'
import { updateDokumentStav, deleteDokumentArchiv } from '@/actions/archiv'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

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
    </div>
  )
}
