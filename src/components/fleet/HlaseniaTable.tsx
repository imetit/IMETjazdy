'use client'

import { useState } from 'react'
import { PRIORITA_LABELS, STAV_HLASENIA_LABELS, type VozidloHlasenie } from '@/lib/fleet-types'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import { updateHlasenie } from '@/actions/fleet-hlasenia'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Modal from '@/components/Modal'

interface Props {
  hlasenia: VozidloHlasenie[]
}

export default function HlaseniaTable({ hlasenia }: Props) {
  const [stavFilter, setStavFilter] = useState('')
  const [selected, setSelected] = useState<VozidloHlasenie | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const filtered = hlasenia.filter(h => {
    if (stavFilter && h.stav !== stavFilter) return false
    return true
  })

  const prioritaColor = (p: string) => {
    switch (p) {
      case 'kriticka': return 'bg-red-100 text-red-800'
      case 'vysoka': return 'bg-orange-100 text-orange-800'
      case 'normalna': return 'bg-blue-100 text-blue-800'
      case 'nizka': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const stavColor = (s: string) => {
    switch (s) {
      case 'nove': return 'bg-red-100 text-red-800'
      case 'prebieha': return 'bg-orange-100 text-orange-800'
      case 'vyriesene': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    setLoading(true)
    setError('')
    const result = await updateHlasenie(selected.id, new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSelected(null)
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={stavFilter} onChange={e => setStavFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Všetky stavy</option>
          {Object.entries(STAV_HLASENIA_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Dátum</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Vozidlo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Nahlásil</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Problém</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Priorita</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Cena</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Stav</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(h => (
              <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">{formatDate(h.created_at)}</td>
                <td className="px-4 py-3">
                  <Link href={`/fleet/vozidla/${h.vozidlo_id}`} className="text-primary hover:underline font-medium">
                    {h.vozidlo?.spz || '—'}
                  </Link>
                </td>
                <td className="px-4 py-3">{h.profile?.full_name || '—'}</td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="truncate text-gray-700">{h.popis}</p>
                  {h.riesenie && <p className="text-xs text-green-600 mt-0.5 truncate">Riešenie: {h.riesenie}</p>}
                  {h.dodavatel && <p className="text-xs text-gray-400 truncate">{h.dodavatel}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioritaColor(h.priorita)}`}>
                    {PRIORITA_LABELS[h.priorita]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {h.cena ? formatCurrency(h.cena) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stavColor(h.stav)}`}>
                    {STAV_HLASENIA_LABELS[h.stav]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelected(h)}
                    className="text-primary hover:underline text-xs font-medium"
                  >
                    Spracovať
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Žiadne hlásenia</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)} title="Spracovanie hlásenia">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{selected.vozidlo?.znacka} {selected.vozidlo?.variant} ({selected.vozidlo?.spz})</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioritaColor(selected.priorita)}`}>
                  {PRIORITA_LABELS[selected.priorita]}
                </span>
              </div>
              <p className="text-sm text-gray-700">{selected.popis}</p>
              <p className="text-xs text-gray-400 mt-1">Nahlásil: {selected.profile?.full_name} · {formatDate(selected.created_at)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stav *</label>
                <select name="stav" defaultValue={selected.stav} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {Object.entries(STAV_HLASENIA_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cena opravy (€)</label>
                <input name="cena" type="number" step="0.01" min="0" defaultValue={selected.cena || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dodávateľ / Servis</label>
                <input name="dodavatel" defaultValue={selected.dodavatel || ''} placeholder="Kde sa to robilo..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dátum vyriešenia</label>
                <input name="datum_vyriesenia" type="date" defaultValue={selected.datum_vyriesenia || new Date().toISOString().split('T')[0]} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Popis riešenia / Čo sa robilo</label>
              <textarea name="riesenie" rows={3} defaultValue={selected.riesenie || ''} placeholder="Popíšte čo sa s tým robilo, aká bola oprava..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Zrušiť</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {loading ? 'Ukladám...' : 'Uložiť'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
