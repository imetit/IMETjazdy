// src/components/dochadzka/DovolenkySchvalovanie.tsx
'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Dovolenka } from '@/lib/dovolenka-types'
import { TYP_DOVOLENKY_LABELS, STAV_DOVOLENKY_LABELS, STAV_DOVOLENKY_COLORS } from '@/lib/dovolenka-types'
import { schvalDovolenku, zamietniDovolenku } from '@/actions/dovolenky'
import { formatDate } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'
import Modal from '@/components/Modal'

interface Props {
  dovolenky: Dovolenka[]
}

export default function DovolenkySchvalovanie({ dovolenky }: Props) {
  const [filter, setFilter] = useState<string>('caka_na_schvalenie')
  const [zamietnutieId, setZamietnutieId] = useState<string | null>(null)
  const [dovod, setDovod] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const filtered = filter === 'vsetko' ? dovolenky : dovolenky.filter(d => d.stav === filter)

  async function handleSchval(id: string) {
    setLoading(true)
    await schvalDovolenku(id)
    setLoading(false)
    router.refresh()
  }

  async function handleZamietni() {
    if (!zamietnutieId || !dovod.trim()) return
    setLoading(true)
    await zamietniDovolenku(zamietnutieId, dovod)
    setZamietnutieId(null)
    setDovod('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Schvaľovanie dovoleniek</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="caka_na_schvalenie">Čakajúce</option>
          <option value="schvalena">Schválené</option>
          <option value="zamietnuta">Zamietnuté</option>
          <option value="vsetko">Všetky</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Zamestnanec</th>
              <th className="px-4 py-3 font-medium">Obdobie</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 font-medium">Stav</th>
              <th className="px-4 py-3 font-medium">Poznámka</th>
              <th className="px-4 py-3 font-medium text-right">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Žiadne žiadosti</td></tr>
            )}
            {filtered.map(d => (
              <tr key={d.id} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">{(d as any).profile?.full_name || '—'}</td>
                <td className="px-4 py-3">{formatDate(d.datum_od)} — {formatDate(d.datum_do)}</td>
                <td className="px-4 py-3">{TYP_DOVOLENKY_LABELS[d.typ]}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STAV_DOVOLENKY_COLORS[d.stav]}`}>
                    {STAV_DOVOLENKY_LABELS[d.stav]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{d.poznamka || '—'}</td>
                <td className="px-4 py-3 text-right">
                  {d.stav === 'caka_na_schvalenie' && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleSchval(d.id)} disabled={loading} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Schváliť">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setZamietnutieId(d.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Zamietnuť">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {zamietnutieId && (
        <Modal title="Zamietnutie dovolenky" onClose={() => setZamietnutieId(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dôvod zamietnutia *</label>
              <textarea value={dovod} onChange={e => setDovod(e.target.value)} rows={3} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Prečo sa žiadosť zamieta..." />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setZamietnutieId(null)} className="px-4 py-2 text-sm text-gray-600">Zrušiť</button>
              <button onClick={handleZamietni} disabled={!dovod.trim() || loading} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {loading ? 'Zamietnujem...' : 'Zamietnuť'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
