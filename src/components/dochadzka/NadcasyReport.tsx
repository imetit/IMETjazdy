// src/components/dochadzka/NadcasyReport.tsx
'use client'

import { formatMinutyNaHodiny } from '@/lib/dochadzka-utils'

interface ZamestnanecReport {
  id: string
  full_name: string
  odpracovane_min: number
  fond_min: number
  rozdiel_min: number
}

interface Props {
  data: ZamestnanecReport[]
}

export default function NadcasyReport({ data }: Props) {
  const sNadcasom = data.filter(d => d.rozdiel_min > 0).sort((a, b) => b.rozdiel_min - a.rozdiel_min)
  const sMankom = data.filter(d => d.rozdiel_min < 0).sort((a, b) => a.rozdiel_min - b.rozdiel_min)

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Nadčasy a manká</h3>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-green-700 mb-2">Nadčasy ({sNadcasom.length})</h4>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {sNadcasom.length === 0 && <tr><td className="px-4 py-6 text-center text-gray-400">Žiadne nadčasy</td></tr>}
                {sNadcasom.map(z => (
                  <tr key={z.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium">{z.full_name}</td>
                    <td className="px-4 py-2 text-right text-green-600 font-medium">{formatMinutyNaHodiny(z.rozdiel_min)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-red-700 mb-2">Manká ({sMankom.length})</h4>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {sMankom.length === 0 && <tr><td className="px-4 py-6 text-center text-gray-400">Žiadne manká</td></tr>}
                {sMankom.map(z => (
                  <tr key={z.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium">{z.full_name}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-medium">{formatMinutyNaHodiny(z.rozdiel_min)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
