// src/components/dochadzka/ExportMzdy.tsx
'use client'

import { Download } from 'lucide-react'

interface ZamestnanecReport {
  id: string
  full_name: string
  odpracovane_min: number
  fond_min: number
  rozdiel_min: number
  fajcenie_min: number
  dni_dochadzka: number
}

interface Props {
  data: ZamestnanecReport[]
  mesiac: string
}

export default function ExportMzdy({ data, mesiac }: Props) {
  function exportCSV() {
    const header = 'Zamestnanec;Dni;Odpracovane (h);Fond (h);Nadcas (h);Fajcenie (min)'
    const rows = data.map(z =>
      `${z.full_name};${z.dni_dochadzka};${(z.odpracovane_min / 60).toFixed(1)};${(z.fond_min / 60).toFixed(1)};${(z.rozdiel_min / 60).toFixed(1)};${z.fajcenie_min}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dochadzka_export_${mesiac}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Export pre mzdový systém</h3>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Download size={16} /> Stiahnuť CSV
        </button>
      </div>
      <p className="text-sm text-gray-500">CSV súbor obsahuje: meno, odpracované dni, odpracované hodiny, fond, nadčas/manko, fajčenie. Oddeľovač: bodkočiarka (;). Kódovanie: UTF-8 s BOM.</p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Zamestnanec</th>
              <th className="px-4 py-3 font-medium">Dni</th>
              <th className="px-4 py-3 font-medium">Odprac. (h)</th>
              <th className="px-4 py-3 font-medium">Fond (h)</th>
              <th className="px-4 py-3 font-medium">Nadčas (h)</th>
              <th className="px-4 py-3 font-medium">Fajčenie (min)</th>
            </tr>
          </thead>
          <tbody>
            {data.map(z => (
              <tr key={z.id} className="border-b border-gray-100">
                <td className="px-4 py-2 font-medium">{z.full_name}</td>
                <td className="px-4 py-2">{z.dni_dochadzka}</td>
                <td className="px-4 py-2">{(z.odpracovane_min / 60).toFixed(1)}</td>
                <td className="px-4 py-2">{(z.fond_min / 60).toFixed(1)}</td>
                <td className="px-4 py-2">
                  <span className={z.rozdiel_min >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {(z.rozdiel_min / 60).toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-2">{z.fajcenie_min}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
