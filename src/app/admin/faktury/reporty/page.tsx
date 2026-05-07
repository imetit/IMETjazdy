import ModuleHelp from '@/components/ModuleHelp'
import { getCashflowForecast, getFakturyList } from '@/actions/faktury'
import CashflowChart from '@/components/faktury/CashflowChart'
import type { Faktura } from '@/lib/faktury-types'
import { formatSuma } from '@/lib/faktury-types'

export default async function FakturyReportyPage() {
  const today = new Date()
  const od = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const doDate = new Date(today.getFullYear(), today.getMonth() + 5, 1)
  const doStr = `${doDate.getFullYear()}-${String(doDate.getMonth() + 1).padStart(2, '0')}`

  const [cashflowResult, overdueResult] = await Promise.all([
    getCashflowForecast(od, doStr),
    getFakturyList({ overdue: true }),
  ])

  const cashflow = 'data' in cashflowResult ? cashflowResult.data : []
  const overdue = 'data' in overdueResult ? (overdueResult.data as Faktura[]) : []

  const totalOverdue = overdue.reduce((s, f) => s + Math.abs(Number(f.suma_celkom_eur || 0)), 0)
  const totalForecast = cashflow.reduce((s, c) => s + c.suma, 0)

  return (
    <div className="space-y-6">
      <ModuleHelp title="Reporty faktúr">
        <p><strong>Cashflow forecast:</strong> Sumy podľa dátumu splatnosti pre nasledujúce mesiace (iba schválené a na úhradu).</p>
        <p><strong>Po splatnosti:</strong> Faktúry ktoré sú schválené alebo na úhradu, ale dátum splatnosti už uplynul.</p>
      </ModuleHelp>

      <h2 className="text-2xl font-bold">Reporty faktúr</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card label="Cashflow nasledujúcich 6 mesiacov" value={`${totalForecast.toFixed(2)} €`} color="bg-blue-50 text-blue-700" />
        <Card label="Po splatnosti" value={`${totalOverdue.toFixed(2)} €`} color="bg-red-50 text-red-700" sub={`${overdue.length} faktúr`} />
        <Card label="Tento mesiac" value={`${(cashflow[0]?.suma || 0).toFixed(2)} €`} color="bg-teal-50 text-teal-700" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Cashflow forecast</h3>
        <CashflowChart data={cashflow} />
      </div>

      {overdue.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Po splatnosti ({overdue.length})</h3>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2">Číslo</th>
                <th className="text-left py-2">Dodávateľ</th>
                <th className="text-right py-2">Suma</th>
                <th className="text-left py-2">Splatnosť</th>
                <th className="text-right py-2">Po splatnosti</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map(f => {
                const days = Math.floor((Date.now() - new Date(f.datum_splatnosti).getTime()) / 86400000)
                return (
                  <tr key={f.id} className="border-b border-gray-100">
                    <td className="py-2"><a href={`/admin/faktury/${f.id}`} className="text-primary hover:underline">{f.cislo_faktury}</a></td>
                    <td className="py-2">{f.dodavatel_nazov}</td>
                    <td className="py-2 text-right tabular-nums">{formatSuma(f.suma_celkom, f.mena)}</td>
                    <td className="py-2">{f.datum_splatnosti}</td>
                    <td className={`py-2 text-right font-medium ${days > 14 ? 'text-red-700' : days > 7 ? 'text-orange-600' : 'text-yellow-700'}`}>{days} dní</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <p className="text-xs">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-75">{sub}</p>}
    </div>
  )
}
