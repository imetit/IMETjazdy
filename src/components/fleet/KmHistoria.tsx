'use client'

import type { KmZaznam } from '@/lib/fleet-types'
import { formatDate } from '@/lib/fleet-utils'

const ZDROJ_LABELS: Record<string, string> = {
  manualne: 'Manuálne',
  jazda: 'Jazda',
  servis: 'Servis',
}

export default function KmHistoria({ zaznamy }: { zaznamy: KmZaznam[] }) {
  if (zaznamy.length === 0) {
    return <p className="text-gray-500 text-sm">Žiadna história km</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="pb-2 font-medium">Dátum</th>
          <th className="pb-2 font-medium">Km</th>
          <th className="pb-2 font-medium">Zdroj</th>
        </tr>
      </thead>
      <tbody>
        {zaznamy.map(z => (
          <tr key={z.id} className="border-b border-gray-100">
            <td className="py-2">{formatDate(z.datum)}</td>
            <td className="py-2 font-medium">{z.km.toLocaleString('sk-SK')} km</td>
            <td className="py-2">
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                {ZDROJ_LABELS[z.zdroj] || z.zdroj}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
