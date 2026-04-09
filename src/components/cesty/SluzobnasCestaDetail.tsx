// src/components/cesty/SluzobnasCestaDetail.tsx
'use client'

import { useState } from 'react'
import { ArrowLeft, FileDown } from 'lucide-react'
import Link from 'next/link'
import type { SluzobnasCesta, CestovnyPrikaz } from '@/lib/cesty-types'
import { DOPRAVA_LABELS, STAV_CESTY_LABELS, STAV_CESTY_COLORS, STAV_PRIKAZU_LABELS, STAV_PRIKAZU_COLORS } from '@/lib/cesty-types'
import { ukoncCestu } from '@/actions/sluzobne-cesty'
import { createPrikaz, updatePrikaz } from '@/actions/cestovne-prikazy'
import { generateCestovnyPrikazPDF } from '@/lib/pdf-cestovny-prikaz'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'

interface Props {
  cesta: SluzobnasCesta
  prikaz: CestovnyPrikaz | null
}

export default function SluzobnasCestaDetail({ cesta, prikaz }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handlePrikazSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('sluzobna_cesta_id', cesta.id)

    const result = prikaz
      ? await updatePrikaz(prikaz.id, formData)
      : await createPrikaz(formData)

    if (result?.error) setError(result.error)
    setLoading(false)
    router.refresh()
  }

  async function handleUkonci() {
    await ukoncCestu(cesta.id)
    router.refresh()
  }

  function handleExportPDF() {
    if (!prikaz) return
    generateCestovnyPrikazPDF(cesta as any, prikaz)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/sluzobne-cesty" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold">{cesta.ciel}</h1>
          <p className="text-gray-500">{(cesta as any).profile?.full_name} · {formatDate(cesta.datum_od)} — {formatDate(cesta.datum_do)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STAV_CESTY_COLORS[cesta.stav]}`}>
          {STAV_CESTY_LABELS[cesta.stav]}
        </span>
      </div>

      {/* Trip info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Detail cesty</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Účel:</span> <span className="font-medium">{cesta.ucel}</span></div>
          <div><span className="text-gray-500">Doprava:</span> <span className="font-medium">{DOPRAVA_LABELS[cesta.doprava]}</span></div>
          <div><span className="text-gray-500">Predpokladané km:</span> <span className="font-medium">{cesta.predpokladany_km || '—'}</span></div>
          <div><span className="text-gray-500">Skutočné km:</span> <span className="font-medium">{cesta.skutocny_km || '—'}</span></div>
          {cesta.poznamka && <div className="col-span-2"><span className="text-gray-500">Poznámka:</span> <span>{cesta.poznamka}</span></div>}
        </div>
        {cesta.stav === 'schvalena' && (
          <button onClick={handleUkonci} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700">
            Ukončiť cestu
          </button>
        )}
      </div>

      {/* Travel order */}
      {(cesta.stav === 'ukoncena' || cesta.stav === 'schvalena' || prikaz) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Cestovný príkaz</h3>
            {prikaz && (
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STAV_PRIKAZU_COLORS[prikaz.stav]}`}>
                  {STAV_PRIKAZU_LABELS[prikaz.stav]}
                </span>
                <button onClick={handleExportPDF} className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-teal-50 rounded-lg font-medium">
                  <FileDown size={16} /> PDF
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <form onSubmit={handlePrikazSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Číslo príkazu</label>
                <input name="cislo_prikazu" defaultValue={prikaz?.cislo_prikazu || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
                <select name="stav" defaultValue={prikaz?.stav || 'navrh'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="navrh">Návrh</option>
                  <option value="schvaleny">Schválený</option>
                  <option value="vyplateny">Vyplatený</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diéty (€)</label>
                <input name="dieta_suma" type="number" step="0.01" min="0" defaultValue={prikaz?.dieta_suma || 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KM náhrada (€)</label>
                <input name="km_nahrada" type="number" step="0.01" min="0" defaultValue={prikaz?.km_nahrada || 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubytovanie (€)</label>
                <input name="ubytovanie" type="number" step="0.01" min="0" defaultValue={prikaz?.ubytovanie || 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Iné náklady (€)</label>
                <input name="ine_naklady" type="number" step="0.01" min="0" defaultValue={prikaz?.ine_naklady || 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            {prikaz && (
              <div className="text-right text-lg font-bold">
                Celkom: {formatCurrency(prikaz.celkom)}
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                {loading ? 'Ukladám...' : prikaz ? 'Aktualizovať príkaz' : 'Vytvoriť príkaz'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
