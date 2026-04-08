'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import { createOdovzdavaciProtokol } from '@/actions/fleet-historia'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/fleet-utils'

interface Vodic {
  id: string
  full_name: string
}

interface Protokol {
  id: string
  datum: string
  km_stav: number | null
  stav_vozidla: string | null
  poskodenia: string | null
  prislusenstvo: string | null
  poznamky: string | null
  odovzdavajuci?: { id: string; full_name: string }
  preberajuci?: { id: string; full_name: string }
}

interface Props {
  vozidloId: string
  vodici: Vodic[]
  aktualnyVodicId?: string | null
  protokoly: Protokol[]
}

export default function OdovzdavaciProtokol({ vozidloId, vodici, aktualnyVodicId, protokoly }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('vozidlo_id', vozidloId)
    const result = await createOdovzdavaciProtokol(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setShowForm(false)
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium">
        + Nový odovzdávací protokol
      </button>

      {/* Existing protocols */}
      {protokoly.length === 0 ? (
        <p className="text-gray-500 text-sm">Žiadne odovzdávacie protokoly</p>
      ) : (
        <div className="space-y-2">
          {protokoly.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium">
                    {p.odovzdavajuci?.full_name || '—'} → {p.preberajuci?.full_name || '—'}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(p.datum)}{p.km_stav ? ` · ${p.km_stav.toLocaleString('sk-SK')} km` : ''}</p>
                </div>
              </div>
              {p.stav_vozidla && <p className="text-xs text-gray-600"><span className="text-gray-400">Stav:</span> {p.stav_vozidla}</p>}
              {p.poskodenia && <p className="text-xs text-gray-600"><span className="text-gray-400">Poškodenia:</span> {p.poskodenia}</p>}
              {p.prislusenstvo && <p className="text-xs text-gray-600"><span className="text-gray-400">Príslušenstvo:</span> {p.prislusenstvo}</p>}
              {p.poznamky && <p className="text-xs text-gray-600"><span className="text-gray-400">Poznámky:</span> {p.poznamky}</p>}
            </div>
          ))}
        </div>
      )}

      {/* New protocol modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Nový odovzdávací protokol">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Odovzdávajúci</label>
                <select name="odovzdavajuci_id" defaultValue={aktualnyVodicId || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">— Nikto —</option>
                  {vodici.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preberajúci *</label>
                <select name="preberajuci_id" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">— Vyber —</option>
                  {vodici.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dátum *</label>
                <input name="datum" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stav km</label>
                <input name="km_stav" type="number" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stav vozidla</label>
              <textarea name="stav_vozidla" rows={2} placeholder="Celkový stav vozidla..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poškodenia</label>
              <textarea name="poskodenia" rows={2} placeholder="Existujúce poškodenia..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Príslušenstvo</label>
              <textarea name="prislusenstvo" rows={2} placeholder="Lekárnička, výstražný trojuholník, rezerva..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poznámky</label>
              <textarea name="poznamky" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Zrušiť</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                {loading ? 'Ukladám...' : 'Vytvoriť protokol'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
