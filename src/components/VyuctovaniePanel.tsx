'use client'

import { useState, useRef } from 'react'
import { Calculator, CheckCircle, RotateCcw, Printer, FileDown } from 'lucide-react'
import { processJazda, returnJazda } from '@/actions/vyuctovanie'
import { calculateVyuctovanie } from '@/lib/calculations'
import { generateVyuctovaniePDF } from '@/lib/pdf'
import type { Jazda, Vozidlo, Paliva, Settings, JazdaTyp } from '@/lib/types'
import { TYP_LABELS, PALIVO_LABELS } from '@/lib/types'

export default function VyuctovaniePanel({ jazda, vozidlo, paliva, settings, employeeName }: {
  jazda: Jazda; vozidlo: Vozidlo; paliva: Paliva; settings: Settings; employeeName: string
}) {
  const [typ, setTyp] = useState<JazdaTyp>(jazda.typ || 'firemne_doma')
  const [preview, setPreview] = useState<ReturnType<typeof calculateVyuctovanie> | null>(null)
  const [loading, setLoading] = useState(false)
  const [returnComment, setReturnComment] = useState('')
  const [showReturn, setShowReturn] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const isProcessed = jazda.stav === 'spracovana'
  const activeTyp = isProcessed ? jazda.typ as JazdaTyp : typ
  const isSukromne = activeTyp?.startsWith('sukromne')
  const isZahranicie = activeTyp?.endsWith('zahranicie')

  function handlePreview() {
    setPreview(calculateVyuctovanie(typ, jazda.km, jazda.cas_odchodu, jazda.cas_prichodu, vozidlo, paliva, settings))
  }

  async function handleProcess() {
    setLoading(true)
    const result = await processJazda(jazda.id, typ)
    if (result?.error) alert(result.error)
    setLoading(false)
  }

  async function handleReturn() {
    if (!returnComment.trim()) return
    setLoading(true)
    await returnJazda(jazda.id, returnComment)
    setLoading(false)
  }

  function handlePrint() {
    if (!printRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>Vyúčtovanie ${jazda.cislo_dokladu || ''}</title>
      <style>body{font-family:'IBM Plex Sans',system-ui,sans-serif;margin:2rem;color:#111}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 32px;margin-bottom:16px;font-size:14px}
      .label{color:#6b7280}.bold{font-weight:600}.total{font-size:18px;font-weight:700;color:#2834e0}
      .box{background:#f8fafc;padding:16px;border-radius:8px;max-width:400px}
      .box div{display:flex;justify-content:space-between;margin-bottom:4px}
      .sep{border-top:1px solid #d1d5db;margin:8px 0}
      .footer{display:flex;justify-content:space-between;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280}
      h2{text-align:center;margin:0}h3{text-align:center;font-size:13px;margin:4px 0 24px}
      .header{display:flex;justify-content:space-between;align-items:start;margin-bottom:24px}
      .right{text-align:right;font-size:13px;color:#6b7280}
      .small{font-size:12px;color:#6b7280;padding-left:16px}
      </style></head><body>
      ${printRef.current.innerHTML}
      <script>window.onload=function(){window.print();window.close()}</script>
      </body></html>
    `)
    printWindow.document.close()
  }

  function handlePDF() {
    generateVyuctovaniePDF(jazda, vozidlo, settings, employeeName)
  }

  const r = isProcessed ? {
    spotreba_litrov: isSukromne ? 0 : (Number(jazda.km) / 100) * Number(jazda.spotreba_pouzita || 0),
    naklady_phm: Number(jazda.naklady_phm || 0),
    dph: isSukromne ? 0 : (Number(jazda.naklady_phm || 0) / (1 + Number(settings.dph_phm) / 100) * (Number(settings.dph_phm) / 100)),
    stravne: Number(jazda.stravne || 0),
    vreckove: Number(jazda.vreckove || 0),
    naklady_celkom: Number(jazda.naklady_celkom || 0),
  } : preview

  return (
    <div className="space-y-6">
      {!isProcessed && (
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Typ vyúčtovania</h3>
          <select value={typ} onChange={(e) => { setTyp(e.target.value as JazdaTyp); setPreview(null) }}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            {Object.entries(TYP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex gap-3 mt-4">
            <button onClick={handlePreview} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <Calculator size={16} /> Vypočítať náhľad
            </button>
          </div>
        </div>
      )}

      {r && (
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{isProcessed ? 'Vyúčtovanie' : 'Náhľad výpočtu'}</h3>

          {/* Printable content */}
          <div ref={printRef}>
            <div className="header" style={{ display: 'none' }}>
              <div>
                {settings.company_name && <h2>{settings.company_name}</h2>}
                <h3>{TYP_LABELS[activeTyp]}</h3>
              </div>
              <div className="right">
                <div>{jazda.cislo_dokladu || ''}</div>
                <div>{jazda.mesiac}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-4">
              <div className="flex"><span className="text-gray-500 w-40">Typ:</span><span>{TYP_LABELS[activeTyp]}</span></div>
              <div className="flex"><span className="text-gray-500 w-40">Zamestnanec:</span><span>{employeeName}</span></div>
              <div className="flex"><span className="text-gray-500 w-40">Vozidlo:</span><span>{vozidlo.znacka} {vozidlo.variant} ({vozidlo.spz})</span></div>
              <div className="flex"><span className="text-gray-500 w-40">PHM:</span><span>{PALIVO_LABELS[vozidlo.palivo]}</span></div>
              {!isSukromne && <div className="flex"><span className="text-gray-500 w-40">Spotreba celkom:</span><span>{r.spotreba_litrov.toFixed(2)} L</span></div>}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm max-w-md">
              {isSukromne ? (
                <div className="flex justify-between"><span>Náhrada za km:</span><span>{r.naklady_phm.toFixed(2)} EUR</span></div>
              ) : (
                <>
                  <div className="flex justify-between"><span>Náhrada za PHM:</span><span>{r.naklady_phm.toFixed(2)} EUR</span></div>
                  <div className="flex justify-between text-gray-500 text-xs pl-4"><span>Z toho DPH {settings.dph_phm}%:</span><span>{r.dph.toFixed(2)} EUR</span></div>
                  <div className="flex justify-between text-gray-500 text-xs pl-4"><span>PHM bez DPH:</span><span>{(r.naklady_phm - r.dph).toFixed(2)} EUR</span></div>
                </>
              )}
              {r.stravne > 0 && <div className="flex justify-between"><span>Stravné:</span><span>{r.stravne.toFixed(2)} EUR</span></div>}
              {isZahranicie && r.vreckove > 0 && <div className="flex justify-between"><span>Vreckové ({settings.vreckove_percento}%):</span><span>{r.vreckove.toFixed(2)} EUR</span></div>}
              <div className="border-t border-gray-300 my-2" />
              <div className="flex justify-between font-bold text-primary text-base"><span>Náhrada celkom:</span><span>{r.naklady_celkom.toFixed(2)} EUR</span></div>
            </div>
          </div>

          {/* Action buttons */}
          {!isProcessed && preview && (
            <div className="flex gap-3 mt-6">
              <button onClick={handleProcess} disabled={loading} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                <CheckCircle size={16} /> Spracovať a prideliť č. dokladu
              </button>
              <button onClick={() => setShowReturn(true)} disabled={loading} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <RotateCcw size={16} /> Vrátiť
              </button>
            </div>
          )}

          {isProcessed && (
            <div className="mt-6">
              <div className="text-sm text-gray-500 mb-4">Č. dokladu: <span className="font-mono font-medium text-gray-900">{jazda.cislo_dokladu}</span></div>
              <div className="flex gap-3">
                <button onClick={handlePrint} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  <Printer size={16} /> Tlačiť
                </button>
                <button onClick={handlePDF} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  <FileDown size={16} /> Uložiť PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showReturn && (
        <div className="bg-white rounded-card shadow-sm border border-red-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Vrátiť jazdu zamestnancovi</h3>
          <textarea value={returnComment} onChange={(e) => setReturnComment(e.target.value)} placeholder="Dôvod vrátenia..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" rows={3} />
          <div className="flex gap-3 mt-3">
            <button onClick={handleReturn} disabled={loading || !returnComment.trim()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">Vrátiť</button>
            <button onClick={() => setShowReturn(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Zrušiť</button>
          </div>
        </div>
      )}
    </div>
  )
}
