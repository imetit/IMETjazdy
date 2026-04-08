'use client'

import { formatDate } from '@/lib/fleet-utils'

interface HistoriaItem {
  id: string
  datum_od: string
  datum_do: string | null
  profile?: { id: string; full_name: string; email: string }
}

export default function HistoriaDrzitelov({ historia }: { historia: HistoriaItem[] }) {
  if (historia.length === 0) {
    return <p className="text-gray-500 text-sm">Žiadna história držiteľov</p>
  }

  return (
    <div className="space-y-2">
      {historia.map((h, i) => (
        <div key={h.id} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${i === 0 && !h.datum_do ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
          <div>
            <p className="text-sm font-medium">{h.profile?.full_name || '—'}</p>
            <p className="text-xs text-gray-500">{h.profile?.email}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">
              {formatDate(h.datum_od)} — {h.datum_do ? formatDate(h.datum_do) : <span className="text-green-600 font-medium">teraz</span>}
            </p>
            {i === 0 && !h.datum_do && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aktuálny držiteľ</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
