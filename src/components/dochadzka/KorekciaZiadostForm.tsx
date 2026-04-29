'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import { vytvoritZiadost } from '@/actions/dochadzka-ziadosti'

interface Props {
  defaultDatum?: string
  povodny_zaznam_id?: string
  onClose: () => void
  onSaved: () => void
}

export default function KorekciaZiadostForm({ defaultDatum, povodny_zaznam_id, onClose, onSaved }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [datum, setDatum] = useState(defaultDatum || today)
  const [navrh_smer, setSmer] = useState<'prichod' | 'odchod' | ''>('')
  const [navrh_dovod, setDovod] = useState('')
  const [navrh_cas, setCas] = useState('')
  const [poznamka, setPoznamka] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!poznamka.trim()) { setError('Poznámka je povinná'); return }
    setLoading(true)
    const result = await vytvoritZiadost({
      datum,
      navrh_smer: navrh_smer || undefined,
      navrh_dovod: navrh_dovod || undefined,
      navrh_cas: navrh_cas ? new Date(navrh_cas).toISOString() : undefined,
      poznamka,
      povodny_zaznam_id,
    })
    if (result && 'error' in result && result.error) { setError(result.error); setLoading(false); return }
    onSaved(); onClose()
  }

  return (
    <Modal title="Nahlásiť chybu v dochádzke" onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Dátum, ku ktorému sa chyba vzťahuje</label>
          <input type="date" value={datum} onChange={e => setDatum(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
          <strong>Voliteľné:</strong> ak viete presne aký záznam má byť, vyplňte návrh. Mzdárka ho môže schváliť jedným klikom.
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Smer (voliteľné)</label>
            <select value={navrh_smer} onChange={e => setSmer(e.target.value as 'prichod' | 'odchod' | '')} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">—</option>
              <option value="prichod">Príchod</option>
              <option value="odchod">Odchod</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Dôvod (voliteľné)</label>
            <select value={navrh_dovod} onChange={e => setDovod(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">—</option>
              <option value="praca">Práca</option>
              <option value="obed">Obed</option>
              <option value="lekar">Lekár</option>
              <option value="lekar_doprovod">Lekár doprovod</option>
              <option value="sluzobne">Služobné</option>
              <option value="sluzobna_cesta">Služobná cesta</option>
              <option value="prechod">Prechod</option>
              <option value="sukromne">Súkromné</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Správny čas (voliteľné)</label>
          <input type="datetime-local" value={navrh_cas} onChange={e => setCas(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Popis problému <span className="text-red-500">*</span></label>
          <textarea value={poznamka} onChange={e => setPoznamka(e.target.value)} rows={4}
            placeholder="Napr.: Zabudol som sa odpípnuť, reálny odchod bol o 16:30 nie 18:25 ako automaticky doplnil systém."
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Zrušiť</button>
          <button onClick={handleSubmit} disabled={loading || !poznamka.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Odosielam…' : 'Odoslať mzdárke'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
