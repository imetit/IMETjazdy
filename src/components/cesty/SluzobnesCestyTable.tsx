// src/components/cesty/SluzobnesCestyTable.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import type { SluzobnasCesta } from '@/lib/cesty-types'
import { DOPRAVA_LABELS, STAV_CESTY_LABELS, STAV_CESTY_COLORS } from '@/lib/cesty-types'
import { schvalCestu, zamietniCestu } from '@/actions/sluzobne-cesty'
import { formatDate } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'

interface Props {
  cesty: SluzobnasCesta[]
}

export default function SluzobnesCestyTable({ cesty }: Props) {
  const [filter, setFilter] = useState<string>('nova')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const filtered = filter === 'vsetko' ? cesty : cesty.filter(c => c.stav === filter)

  async function handleSchval(id: string) {
    setLoading(true)
    await schvalCestu(id)
    setLoading(false)
    router.refresh()
  }

  async function handleZamietni(id: string) {
    setLoading(true)
    await zamietniCestu(id)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Služobné cesty</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="nova">Nové (na schválenie)</option>
          <option value="schvalena">Schválené</option>
          <option value="ukoncena">Ukončené</option>
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
              <th className="px-4 py-3 font-medium">Cieľ</th>
              <th className="px-4 py-3 font-medium">Účel</th>
              <th className="px-4 py-3 font-medium">Doprava</th>
              <th className="px-4 py-3 font-medium">Stav</th>
              <th className="px-4 py-3 font-medium text-right">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Žiadne záznamy</td></tr>}
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">{(c as any).profile?.full_name || '—'}</td>
                <td className="px-4 py-3">{formatDate(c.datum_od)} — {formatDate(c.datum_do)}</td>
                <td className="px-4 py-3">{c.ciel}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.ucel}</td>
                <td className="px-4 py-3 text-gray-500">{DOPRAVA_LABELS[c.doprava]}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STAV_CESTY_COLORS[c.stav]}`}>
                    {STAV_CESTY_LABELS[c.stav]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {c.stav === 'nova' && (
                      <>
                        <button onClick={() => handleSchval(c.id)} disabled={loading} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Schváliť">
                          <Check size={16} />
                        </button>
                        <button onClick={() => handleZamietni(c.id)} disabled={loading} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Zamietnuť">
                          <X size={16} />
                        </button>
                      </>
                    )}
                    <Link href={`/admin/sluzobne-cesty/${c.id}`} className="p-1.5 text-primary hover:bg-teal-50 rounded text-xs font-medium">
                      Detail
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
