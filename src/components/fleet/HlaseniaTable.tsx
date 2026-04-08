'use client'

import { useState } from 'react'
import { PRIORITA_LABELS, STAV_HLASENIA_LABELS, type VozidloHlasenie } from '@/lib/fleet-types'
import { formatDate } from '@/lib/fleet-utils'
import { updateHlasenieStav } from '@/actions/fleet-hlasenia'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  hlasenia: VozidloHlasenie[]
}

export default function HlaseniaTable({ hlasenia }: Props) {
  const [stavFilter, setStavFilter] = useState('')
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

  async function changeStav(id: string, stav: string) {
    await updateHlasenieStav(id, stav)
    router.refresh()
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
              <th className="text-left px-4 py-3 font-medium text-gray-500">Popis</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Priorita</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Stav</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Akcia</th>
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
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{h.popis}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioritaColor(h.priorita)}`}>
                    {PRIORITA_LABELS[h.priorita]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stavColor(h.stav)}`}>
                    {STAV_HLASENIA_LABELS[h.stav]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={h.stav}
                    onChange={e => changeStav(h.id, e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    {Object.entries(STAV_HLASENIA_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Žiadne hlásenia</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
