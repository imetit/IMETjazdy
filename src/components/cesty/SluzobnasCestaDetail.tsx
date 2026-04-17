// src/components/cesty/SluzobnasCestaDetail.tsx
'use client'

import { useState } from 'react'
import { ArrowLeft, FileDown, CheckCircle, XCircle, FileText } from 'lucide-react'
import Link from 'next/link'
import type { SluzobnasCesta, CestovnyPrikaz } from '@/lib/cesty-types'
import { DOPRAVA_LABELS, STAV_CESTY_LABELS, STAV_CESTY_COLORS, STAV_PRIKAZU_LABELS, STAV_PRIKAZU_COLORS } from '@/lib/cesty-types'
import { ukoncCestu, reviewCestaDoklad, updateVyuctovanieStav } from '@/actions/sluzobne-cesty'
import { createPrikaz, updatePrikaz } from '@/actions/cestovne-prikazy'
import { generateCestovnyPrikazPDF } from '@/lib/pdf-cestovny-prikaz'
import { calculateCestovneNahrady, calculateDietyEnhanced } from '@/lib/diety-utils'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'

interface CestaDoklad {
  id: string
  sluzobna_cesta_id: string
  nazov: string
  file_path: string
  file_size: number | null
  typ: string | null
  suma: number | null
  created_at: string
  stav: string
}

interface Props {
  cesta: SluzobnasCesta
  prikaz: CestovnyPrikaz | null
  doklady: CestaDoklad[]
}

const DOKLAD_STAV_LABELS: Record<string, string> = {
  neskontrolovany: 'Neskontrolovaný',
  schvaleny: 'Schválený',
  zamietnuty: 'Zamietnutý',
}

const DOKLAD_STAV_COLORS: Record<string, string> = {
  neskontrolovany: 'bg-gray-100 text-gray-700',
  schvaleny: 'bg-green-100 text-green-800',
  zamietnuty: 'bg-red-100 text-red-800',
}

const VYUCTOVANIE_STAV_LABELS: Record<string, string> = {
  caka_na_doklady: 'Čaká na doklady',
  vyuctovane: 'Vyúčtované',
  uzavrete: 'Uzavreté',
}

const VYUCTOVANIE_STAV_COLORS: Record<string, string> = {
  caka_na_doklady: 'bg-orange-100 text-orange-800',
  vyuctovane: 'bg-blue-100 text-blue-800',
  uzavrete: 'bg-green-100 text-green-800',
}

export default function SluzobnasCestaDetail({ cesta, prikaz, doklady }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dokladLoading, setDokladLoading] = useState<string | null>(null)
  const [vyuctovanieLoading, setVyuctovanieLoading] = useState(false)
  const router = useRouter()

  // Auto-výpočet diét podľa SK legislatívy
  const km = cesta.skutocny_km || cesta.predpokladany_km || 0
  const autoCalc = calculateCestovneNahrady(cesta.datum_od, cesta.datum_do, km, cesta.doprava)

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

  async function handleReviewDoklad(dokladId: string, stav: 'schvaleny' | 'zamietnuty') {
    setDokladLoading(dokladId)
    await reviewCestaDoklad(dokladId, stav)
    setDokladLoading(null)
    router.refresh()
  }

  async function handleVyuctovanieStav(stav: string) {
    setVyuctovanieLoading(true)
    await updateVyuctovanieStav(cesta.id, stav)
    setVyuctovanieLoading(false)
    router.refresh()
  }

  function isImageFile(path: string) {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(path)
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Enhanced diet calculation
  const dietyEnhanced = calculateDietyEnhanced(
    cesta.datum_od,
    cesta.datum_do,
    (cesta as any).cas_od || '08:00',
    (cesta as any).cas_do || '17:00',
    (cesta as any).krajina,
    (cesta as any).zahranicne_sadzby,
  )

  // Settlement calculations
  const schvaleneDoklady = doklady.filter(d => d.stav === 'schvaleny')
  const sumaSchvalenychDokladov = schvaleneDoklady.reduce((sum, d) => sum + (d.suma || 0), 0)
  const preddavok = (cesta as any).preddavok_suma || 0
  const vysledok = dietyEnhanced.dieta + sumaSchvalenychDokladov - preddavok
  const vyuctovanieStav = (cesta as any).vyuctovanie_stav || 'caka_na_doklady'

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
            {!prikaz && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800">
                <p className="font-medium mb-1">Automatický výpočet (SK legislatíva):</p>
                <p>Diéty: {autoCalc.dieta.toFixed(2)} € | KM náhrada: {autoCalc.kmNahrada.toFixed(2)} € | Celkom: {autoCalc.celkom.toFixed(2)} €</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diéty (€)</label>
                <input name="dieta_suma" type="number" step="0.01" min="0" defaultValue={prikaz?.dieta_suma ?? autoCalc.dieta} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KM náhrada (€)</label>
                <input name="km_nahrada" type="number" step="0.01" min="0" defaultValue={prikaz?.km_nahrada ?? autoCalc.kmNahrada} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
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

      {/* Doklady section */}
      {doklady.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Doklady ({doklady.length})</h3>
          <div className="space-y-3">
            {doklady.map((doklad) => (
              <div key={doklad.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg">
                {isImageFile(doklad.file_path) ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 border">
                    <img
                      src={doklad.file_path}
                      alt={doklad.nazov}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-gray-50 border flex items-center justify-center">
                    <FileText size={20} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doklad.nazov}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(doklad.file_size)}
                    {doklad.suma != null && ` · ${formatCurrency(doklad.suma)}`}
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${DOKLAD_STAV_COLORS[doklad.stav] || 'bg-gray-100 text-gray-700'}`}>
                  {DOKLAD_STAV_LABELS[doklad.stav] || doklad.stav}
                </span>
                {doklad.stav === 'neskontrolovany' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleReviewDoklad(doklad.id, 'schvaleny')}
                      disabled={dokladLoading === doklad.id}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                      title="Schváliť"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => handleReviewDoklad(doklad.id, 'zamietnuty')}
                      disabled={dokladLoading === doklad.id}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Zamietnuť"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vyúčtovanie section */}
      {(cesta.stav === 'ukoncena' || cesta.stav === 'schvalena') && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Vyúčtovanie</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${VYUCTOVANIE_STAV_COLORS[vyuctovanieStav] || 'bg-gray-100 text-gray-700'}`}>
              {VYUCTOVANIE_STAV_LABELS[vyuctovanieStav] || vyuctovanieStav}
            </span>
          </div>

          <div className="space-y-3">
            {/* Diet breakdown */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-teal-800 mb-1">Diéty</p>
              <p className="text-teal-700">{dietyEnhanced.breakdown}</p>
              <p className="font-semibold text-teal-900 mt-1">{formatCurrency(dietyEnhanced.dieta)}</p>
            </div>

            {/* Breakdown table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-600">Diéty</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(dietyEnhanced.dieta)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-600">Schválené doklady ({schvaleneDoklady.length})</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(sumaSchvalenychDokladov)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-600">Preddavok</td>
                    <td className="px-4 py-2 text-right font-medium">- {formatCurrency(preddavok)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 font-semibold">Výsledok</td>
                    <td className={`px-4 py-3 text-right font-bold text-lg ${vysledok > 0 ? 'text-green-700' : vysledok < 0 ? 'text-orange-700' : 'text-gray-700'}`}>
                      {formatCurrency(Math.abs(vysledok))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {vysledok > 0 && (
              <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                Doplatok zamestnancovi: {formatCurrency(vysledok)}
              </p>
            )}
            {vysledok < 0 && (
              <p className="text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
                Preplatenie (zamestnanec vráti): {formatCurrency(Math.abs(vysledok))}
              </p>
            )}

            {/* Workflow buttons */}
            <div className="flex gap-2 pt-2">
              {vyuctovanieStav === 'caka_na_doklady' && (
                <button
                  onClick={() => handleVyuctovanieStav('vyuctovane')}
                  disabled={vyuctovanieLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {vyuctovanieLoading ? 'Ukladám...' : 'Označiť ako vyúčtované'}
                </button>
              )}
              {vyuctovanieStav === 'vyuctovane' && (
                <button
                  onClick={() => handleVyuctovanieStav('uzavrete')}
                  disabled={vyuctovanieLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {vyuctovanieLoading ? 'Ukladám...' : 'Uzavrieť vyúčtovanie'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
