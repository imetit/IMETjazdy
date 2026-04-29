'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface MonthlyStat {
  mesiac: string
  odpracovane_hod: number
  fond_hod: number
  dovolenka_dni: number
  pn_dni: number
  pocet_zamestnancov: number
}

interface Props {
  mesacne: MonthlyStat[]
  topPN: Array<{ full_name: string; total_hod: number }>
  pocetSchvalenychMesiacov: number
  pocetUzavretychMesiacov: number
}

export default function StatistikyDashboard({ mesacne, topPN, pocetSchvalenychMesiacov, pocetUzavretychMesiacov }: Props) {
  const lastMonth = mesacne[mesacne.length - 1]
  const utilization = lastMonth && lastMonth.fond_hod > 0
    ? Math.round((lastMonth.odpracovane_hod / lastMonth.fond_hod) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">Aktuálne odpracované</div>
          <div className="text-2xl font-bold mt-1">{lastMonth?.odpracovane_hod || 0}h</div>
          <div className="text-[11px] text-gray-400">posledný mesiac</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">Vyťaženie</div>
          <div className="text-2xl font-bold mt-1">{utilization}%</div>
          <div className="text-[11px] text-gray-400">odprac. / fond</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">Schválené hodiny</div>
          <div className="text-2xl font-bold mt-1">{pocetSchvalenychMesiacov}</div>
          <div className="text-[11px] text-gray-400">spolu mesiac×osoba</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">Uzavretých mesiacov</div>
          <div className="text-2xl font-bold mt-1">{pocetUzavretychMesiacov}</div>
          <div className="text-[11px] text-gray-400">finalizované</div>
        </div>
      </div>

      {/* Trend graf — odpracované vs fond */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Trend odpracovaných hodín (12 mesiacov)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesacne}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mesiac" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="odpracovane_hod" stroke="#0d9488" strokeWidth={2} name="Odpracované hod" />
            <Line type="monotone" dataKey="fond_hod" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Fond hod" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Dovolenky / PN trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Dovolenka a PN (dni / mesiac)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={mesacne}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mesiac" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="dovolenka_dni" fill="#3b82f6" name="Dovolenka" />
            <Bar dataKey="pn_dni" fill="#f97316" name="PN" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top PN za rok */}
      {topPN.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 10 PN dní za rok</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 uppercase">
                <th className="py-2">Zamestnanec</th>
                <th className="py-2 text-right">PN dní</th>
              </tr>
            </thead>
            <tbody>
              {topPN.map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{p.full_name}</td>
                  <td className="py-2 text-right font-mono">{p.total_hod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
