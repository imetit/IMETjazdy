// src/components/dochadzka/MesacnyVykaz.tsx
'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { formatMinutyNaHodiny } from '@/lib/dochadzka-utils'

interface ZamestnanecReport {
  id: string
  full_name: string
  pracovny_fond_hodiny: number
  odpracovane_min: number
  fond_min: number
  rozdiel_min: number
  fajcenie_min: number
  dni_dochadzka: number
}

interface Props {
  data: ZamestnanecReport[]
  mesiac: string
  onExportPDF: (userId: string) => void
}

export default function MesacnyVykaz({ data, mesiac, onExportPDF }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Mesačný výkaz — {mesiac}</h3>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Zamestnanec</th>
              <th className="px-4 py-3 font-medium">Dni</th>
              <th className="px-4 py-3 font-medium">Odpracované</th>
              <th className="px-4 py-3 font-medium">Fond</th>
              <th className="px-4 py-3 font-medium">Rozdiel</th>
              <th className="px-4 py-3 font-medium">Fajčenie</th>
              <th className="px-4 py-3 font-medium text-right">Export</th>
            </tr>
          </thead>
          <tbody>
            {data.map(z => (
              <tr key={z.id} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">{z.full_name}</td>
                <td className="px-4 py-3">{z.dni_dochadzka}</td>
                <td className="px-4 py-3">{Math.floor(z.odpracovane_min / 60)}h {z.odpracovane_min % 60}min</td>
                <td className="px-4 py-3">{Math.floor(z.fond_min / 60)}h</td>
                <td className="px-4 py-3">
                  <span className={z.rozdiel_min >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {formatMinutyNaHodiny(z.rozdiel_min)}
                  </span>
                </td>
                <td className="px-4 py-3 text-orange-600">{z.fajcenie_min > 0 ? `${z.fajcenie_min}min` : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onExportPDF(z.id)} className="p-1.5 text-primary hover:bg-teal-50 rounded" title="Stiahnuť PDF">
                    <FileDown size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
