import { getMesacnyJazdyReport, getRocnyJazdyReport } from '@/actions/jazdy-reporty'
import { getReportData } from '@/actions/dochadzka-reporty'
import AdminReporty from '@/components/AdminReporty'

export default async function AdminReportyPage() {
  const now = new Date()
  const mesiac = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [jazdyResult, dochadzkaResult, rocnyResult] = await Promise.all([
    getMesacnyJazdyReport(mesiac),
    getReportData(mesiac),
    getRocnyJazdyReport(now.getFullYear()),
  ])

  return (
    <AdminReporty
      initialMesiac={mesiac}
      jazdyData={jazdyResult.data || []}
      dochadzkaData={dochadzkaResult.data || []}
      rocnyData={rocnyResult.data || []}
    />
  )
}
