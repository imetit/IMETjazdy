'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { TYP_SERVISU_LABELS, STAV_SERVISU_LABELS, type VozidloServis } from '@/lib/fleet-types'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import type { Vozidlo } from '@/lib/types'
import ServisForm from './ServisForm'
import { createServis } from '@/actions/fleet-servisy'
import { useRouter } from 'next/navigation'

interface Props {
  servisy: (VozidloServis & { vozidlo?: Vozidlo })[]
  vozidla: Vozidlo[]
  defaultVozidloId?: string
}

export default function ServisTable({ servisy, vozidla, defaultVozidloId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [typFilter, setTypFilter] = useState('')
  const [stavFilter, setStavFilter] = useState('')
  const router = useRouter()

  const filtered = servisy.filter(s => {
    if (typFilter && s.typ !== typFilter) return false
    if (stavFilter && s.stav !== stavFilter) return false
    return true
  })

  const stavColor = (stav: string) => {
    switch (stav) {
      case 'planovane': return 'bg-blue-100 text-blue-800'
      case 'prebieha': return 'bg-orange-100 text-orange-800'
      case 'dokoncene': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select value={typFilter} onChange={e => setTypFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Všetky typy</option>
            {Object.entries(TYP_SERVISU_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
          <select value={stavFilter} onChange={e => setStavFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Všetky stavy</option>
            {Object.entries(STAV_SERVISU_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={16} /> Nový záznam
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Dátum</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Vozidlo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Typ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Popis</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Dodávateľ</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Cena</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Stav</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">{formatDate(s.datum)}</td>
                <td className="px-4 py-3 font-medium">{s.vozidlo?.spz || '—'}</td>
                <td className="px-4 py-3">{TYP_SERVISU_LABELS[s.typ]}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{s.popis}</td>
                <td className="px-4 py-3 text-gray-600">{s.dodavatel || '—'}</td>
                <td className="px-4 py-3 text-right">{s.cena ? formatCurrency(s.cena) : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stavColor(s.stav)}`}>
                    {STAV_SERVISU_LABELS[s.stav]}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Žiadne servisné záznamy</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ServisForm
          vozidla={vozidla}
          defaultVozidloId={defaultVozidloId}
          onSubmit={createServis}
          onClose={() => { setShowForm(false); router.refresh() }}
        />
      )}
    </div>
  )
}
