// src/components/cesty/SluzobnasCestaForm.tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { SluzobnasCesta, DopravaCesty } from '@/lib/cesty-types'
import { DOPRAVA_LABELS, STAV_CESTY_LABELS, STAV_CESTY_COLORS } from '@/lib/cesty-types'
import { createCesta, updateSkutocneKm } from '@/actions/sluzobne-cesty'
import { formatDate } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'

interface Props {
  cesty: SluzobnasCesta[]
}

export default function SluzobnasCestaForm({ cesty }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editKm, setEditKm] = useState<string | null>(null)
  const [kmValue, setKmValue] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const result = await createCesta(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setShowForm(false)
      e.currentTarget.reset()
    }
    setLoading(false)
    router.refresh()
  }

  async function handleKmUpdate(cestaId: string) {
    if (!kmValue) return
    await updateSkutocneKm(cestaId, parseInt(kmValue))
    setEditKm(null)
    setKmValue('')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Služobné cesty</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nová žiadosť
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Nová služobná cesta</h3>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Od *</label>
                <input name="datum_od" type="date" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Do *</label>
                <input name="datum_do" type="date" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cieľ cesty *</label>
              <input name="ciel" required placeholder="Napr. Bratislava, Košice..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Účel cesty *</label>
              <input name="ucel" required placeholder="Napr. Obchodné rokovanie, školenie..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doprava</label>
                <select name="doprava" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {(Object.keys(DOPRAVA_LABELS) as DopravaCesty[]).map(d => (
                    <option key={d} value={d}>{DOPRAVA_LABELS[d]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Predpokladané km</label>
                <input name="predpokladany_km" type="number" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
              <textarea name="poznamka" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Zrušiť</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                {loading ? 'Odosielam...' : 'Odoslať žiadosť'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Obdobie</th>
              <th className="px-4 py-3 font-medium">Cieľ</th>
              <th className="px-4 py-3 font-medium">Doprava</th>
              <th className="px-4 py-3 font-medium">KM</th>
              <th className="px-4 py-3 font-medium">Stav</th>
            </tr>
          </thead>
          <tbody>
            {cesty.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Žiadne služobné cesty</td></tr>}
            {cesty.map(c => (
              <tr key={c.id} className="border-b border-gray-100">
                <td className="px-4 py-3">{formatDate(c.datum_od)} — {formatDate(c.datum_do)}</td>
                <td className="px-4 py-3 font-medium">{c.ciel}</td>
                <td className="px-4 py-3 text-gray-500">{DOPRAVA_LABELS[c.doprava]}</td>
                <td className="px-4 py-3">
                  {c.stav === 'schvalena' && !c.skutocny_km ? (
                    editKm === c.id ? (
                      <div className="flex gap-1">
                        <input type="number" value={kmValue} onChange={e => setKmValue(e.target.value)} className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs" />
                        <button onClick={() => handleKmUpdate(c.id)} className="text-xs text-primary">OK</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditKm(c.id); setKmValue(String(c.predpokladany_km || '')) }} className="text-xs text-primary hover:underline">
                        Doplniť km
                      </button>
                    )
                  ) : (
                    <span>{c.skutocny_km || c.predpokladany_km || '—'} km</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STAV_CESTY_COLORS[c.stav]}`}>
                    {STAV_CESTY_LABELS[c.stav]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
