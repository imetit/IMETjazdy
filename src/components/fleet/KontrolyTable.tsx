'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { TYP_KONTROLY_LABELS, type VozidloKontrola } from '@/lib/fleet-types'
import { formatDate } from '@/lib/fleet-utils'
import StatusIndicator from './StatusIndicator'
import KontrolaForm from './KontrolaForm'
import { createKontrola } from '@/actions/fleet-kontroly'
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
  const router = useRouter()

  const filtered = kontroly.filter(k => {
    if (typFilter && k.typ !== typFilter) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <select value={typFilter} onChange={e => setTypFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Všetky typy</option>
          {Object.entries(TYP_KONTROLY_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={16} /> Nová kontrola
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Vozidlo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Typ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Dátum vykonania</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Platnosť do</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Stav</th>
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
                <td className="px-4 py-3">{formatDate(k.datum_vykonania)}</td>
                <td className="px-4 py-3">{formatDate(k.platnost_do)}</td>
                <td className="px-4 py-3"><StatusIndicator platnostDo={k.platnost_do} /></td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{k.poznamka || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Žiadne kontroly</td></tr>
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
