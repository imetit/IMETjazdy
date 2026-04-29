'use client'

import { useState } from 'react'
import { upravitZaznam, zmazatZaznam, pridatZaznam } from '@/actions/dochadzka-korekcie'
import Modal from '@/components/Modal'
import { Trash2, AlertCircle } from 'lucide-react'

interface ExistingZaznam {
  id: string
  smer: 'prichod' | 'odchod'
  dovod: string
  cas: string
  zdroj?: string
  auto_doplnene?: boolean
  povodny_cas?: string | null
}

interface Props {
  zaznam?: ExistingZaznam
  userId: string
  datum: string
  onClose: () => void
  onSaved: () => void
}

export default function DochadzkaEditorModal({ zaznam, userId, datum, onClose, onSaved }: Props) {
  const [smer, setSmer] = useState<'prichod' | 'odchod'>(zaznam?.smer || 'prichod')
  const [dovod, setDovod] = useState(zaznam?.dovod || 'praca')
  const [cas, setCas] = useState(() => {
    if (zaznam) return new Date(zaznam.cas).toISOString().slice(0, 16)
    return `${datum}T08:00`
  })
  const [korekcia, setKorekcia] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!korekcia.trim()) { setError('Dôvod korektúry je povinný'); return }
    setLoading(true); setError('')
    const isoCase = new Date(cas).toISOString()
    const result = zaznam
      ? await upravitZaznam(zaznam.id, isoCase, smer, dovod, korekcia)
      : await pridatZaznam({ user_id: userId, datum, smer, dovod, cas: isoCase, korekcia_dovod: korekcia })
    if (result && 'error' in result && result.error) {
      setError(result.error); setLoading(false); return
    }
    onSaved(); onClose()
  }

  async function handleDelete() {
    if (!zaznam) return
    if (!korekcia.trim()) { setError('Dôvod zmazania je povinný (vyplň pole nižšie)'); return }
    if (!confirm('Naozaj zmazať tento záznam?')) return
    setLoading(true)
    const result = await zmazatZaznam(zaznam.id, korekcia)
    if (result && 'error' in result && result.error) {
      setError(result.error); setLoading(false); return
    }
    onSaved(); onClose()
  }

  return (
    <Modal title={zaznam ? 'Upraviť záznam dochádzky' : 'Pridať záznam dochádzky'} onClose={onClose}>
      <div className="space-y-4">
        {zaznam?.auto_doplnene && (
          <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-900">
            <AlertCircle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <strong>Auto-doplnený záznam.</strong> Systém automaticky pridal odchod, lebo zamestnanec sa zabudol odpípnuť. Skontrolujte správnosť času.
            </div>
          </div>
        )}

        {zaznam?.povodny_cas && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            Pôvodný čas: <span className="font-mono">{new Date(zaznam.povodny_cas).toLocaleString('sk-SK')}</span>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Smer</label>
            <select value={smer} onChange={e => setSmer(e.target.value as 'prichod' | 'odchod')}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="prichod">Príchod</option>
              <option value="odchod">Odchod</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Dôvod</label>
            <select value={dovod} onChange={e => setDovod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="praca">Práca</option>
              <option value="obed">Obed</option>
              <option value="lekar">Lekár</option>
              <option value="lekar_doprovod">Lekár doprovod</option>
              <option value="sluzobne">Služobne</option>
              <option value="sluzobna_cesta">Služobná cesta</option>
              <option value="prechod">Prechod</option>
              <option value="fajcenie">Fajčenie</option>
              <option value="sukromne">Súkromné</option>
              <option value="dovolenka">Dovolenka</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Čas</label>
          <input type="datetime-local" value={cas} onChange={e => setCas(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Dôvod korektúry <span className="text-red-500">*</span>
          </label>
          <textarea value={korekcia} onChange={e => setKorekcia(e.target.value)}
            placeholder="Napr.: Reálny čas overený telefonicky / Auto-doplnené potvrdené"
            rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" required />
          <p className="text-[11px] text-gray-500 mt-1">Tento text sa uloží do auditu a uvidí ho aj zamestnanec.</p>
        </div>

        <div className="flex justify-between gap-3 pt-2">
          {zaznam && (
            <button onClick={handleDelete} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
              <Trash2 size={14} /> Zmazať
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Zrušiť</button>
            <button onClick={handleSave} disabled={loading || !korekcia.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark disabled:opacity-50">
              {loading ? 'Ukladám…' : 'Uložiť'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
