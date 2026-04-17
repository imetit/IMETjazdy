import { getMesacnyJazdyReport, getRocnyJazdyReport } from '@/actions/jazdy-reporty'
import { getReportData } from '@/actions/dochadzka-reporty'
import AdminReporty from '@/components/AdminReporty'
import ModuleHelp from '@/components/ModuleHelp'

export default async function AdminReportyPage() {
  const now = new Date()
  const mesiac = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [jazdyResult, dochadzkaResult, rocnyResult] = await Promise.all([
    getMesacnyJazdyReport(mesiac),
    getReportData(mesiac),
    getRocnyJazdyReport(now.getFullYear()),
  ])

  return (
    <div>
      <ModuleHelp title="Reporty">
        <p><strong>Čo tu nájdete:</strong> Súhrnné prehľady a exporty pre účtovníctvo a vedenie.</p>
        <p><strong>Náklady jázd:</strong> Mesačný/ročný prehľad cestovných náhrad per zamestnanec.</p>
        <p><strong>Dochádzka:</strong> Odpracované hodiny, nadčas, absencie per zamestnanec.</p>
        <p><strong>Ročný prehľad:</strong> Sumárne dáta za celý rok.</p>
        <p><strong>CSV export:</strong> Export pre mzdárku — odpracované hodiny, náhrady, dovolenky.</p>
      </ModuleHelp>
      <AdminReporty
        initialMesiac={mesiac}
        jazdyData={jazdyResult.data || []}
        dochadzkaData={dochadzkaResult.data || []}
        rocnyData={rocnyResult.data || []}
      />
    </div>
  )
}
