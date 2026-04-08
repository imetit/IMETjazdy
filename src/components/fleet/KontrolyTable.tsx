'use client'

import { useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { TYP_KONTROLY_LABELS, type VozidloKontrola } from '@/lib/fleet-types'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import StatusIndicator from './StatusIndicator'
import KontrolaForm from './KontrolaForm'
import { createKontrola, toggleZaplatene } from '@/actions/fleet-kontroly'
import { useRouter } from 'next/navigation'
import type { Vozidlo } from '@/lib/types'
import Link from 'next/link'

interface Props {
  kontroly: (VozidloKontrola & { vozidlo?: Vozidlo })[]
  vozidla: Vozidlo[]
}

export default function KontrolyTable({ kontroly, vozidla }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [typFilter, setTypFilter] = useState('')
  const [zaplateneFilter, setZaplateneFilter] = useState('')
  const router = useRouter()

  const filtered = kontroly.filter(k => {
    if (typFilter && k.typ !== typFilter) return false
    if (zaplateneFilter === 'zaplatene' && !k.zaplatene) return false
    if (zaplateneFilter === 'nezaplatene' && k.zaplatene) return false
    return true
  })

  // Calculate totals
  const celkovaCena = filtered.reduce((sum, k) => sum + (k.cena || 0), 0)
  const zaplatene = filtered.filter(k => k.zaplatene).reduce((sum, k) => sum + (k.cena || 0), 0)
  const nezaplatene = celkovaCena - zaplatene

  async function handleToggleZaplatene(id: string, currentState: boolean) {
    await toggleZaplatene(id, !currentState)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select value={typFilter} onChange={e => setTypFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Všetky typy</option>
            {Object.entries(TYP_KONTROLY_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
          <select value={zaplateneFilter} onChange={e => setZaplateneFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Všetky platby</option>
            <option value="zaplatene">Zaplatené</option>
            <option value="nezaplatene">Nezaplatené</option>
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={16} /> Nová kontrola
        </button>
      </div>

      {/* Summary cards */}
      {celkovaCena > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-500">Celkom</p>
            <p className="text-lg font-bold">{formatCurrency(celkovaCena)}</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
            <p className="text-xs text-green-600">Zaplatené</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(zaplatene)}</p>
          </div>
          <div className={`rounded-lg border p-3 text-center ${nezaplatene > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-xs ${nezaplatene > 0 ? 'text-red-600' : 'text-gray-500'}`}>Nezaplatené</p>
            <p className={`text-lg font-bold ${nezaplatene > 0 ? 'text-red-700' : 'text-gray-400'}`}>{formatCurrency(nezaplatene)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Vozidlo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Typ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Platnosť do</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Stav</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Cena</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Platba</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(k => (
              <tr key={k.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/fleet/vozidla/${k.vozidlo_id}`} className="text-primary hover:underline font-medium">
                    {k.vozidlo?.spz || '—'}
                  </Link>
                </td>
                <td className="px-4 py-3">{TYP_KONTROLY_LABELS[k.typ as keyof typeof TYP_KONTROLY_LABELS]}</td>
                <td className="px-4 py-3">{formatDate(k.platnost_do)}</td>
                <td className="px-4 py-3"><StatusIndicator platnostDo={k.platnost_do} /></td>
                <td className="px-4 py-3 text-right font-medium">{k.cena ? formatCurrency(k.cena) : '—'}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleZaplatene(k.id, k.zaplatene)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      k.zaplatene
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {k.zaplatene ? <><Check size={12} /> Zaplatené</> : <><X size={12} /> Nezaplatené</>}
                  </button>
                  {k.datum_platby && (
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(k.datum_platby)}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{k.poznamka || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Žiadne kontroly</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <KontrolaForm
          vozidla={vozidla}
          onSubmit={createKontrola}
          onClose={() => { setShowForm(false); router.refresh() }}
        />
      )}
    </div>
  )
}
