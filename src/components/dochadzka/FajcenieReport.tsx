// src/components/dochadzka/FajcenieReport.tsx
'use client'

interface ZamestnanecReport {
  id: string
  full_name: string
  fajcenie_min: number
}

interface Props {
  data: ZamestnanecReport[]
}

export default function FajcenieReport({ data }: Props) {
  const sorted = [...data].filter(d => d.fajcenie_min > 0).sort((a, b) => b.fajcenie_min - a.fajcenie_min)
  const celkom = sorted.reduce((sum, d) => sum + d.fajcenie_min, 0)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Fajčiarske prestávky</h3>
      {sorted.length === 0 ? (
        <p className="text-gray-500">Žiadne fajčiarske prestávky v tomto mesiaci</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Zamestnanec</th>
                <th className="px-4 py-3 font-medium">Celkový čas</th>
                <th className="px-4 py-3 font-medium">Priemer/deň</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((z, i) => (
                <tr key={z.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{z.full_name}</td>
                  <td className="px-4 py-3 text-orange-600 font-medium">{Math.floor(z.fajcenie_min / 60)}h {z.fajcenie_min % 60}min</td>
                  <td className="px-4 py-3 text-gray-500">~{Math.round(z.fajcenie_min / 22)}min</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium">
                <td colSpan={2} className="px-4 py-3">Celkom</td>
                <td className="px-4 py-3 text-orange-600">{Math.floor(celkom / 60)}h {celkom % 60}min</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
