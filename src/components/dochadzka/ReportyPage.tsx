'use client'

import { useState, useEffect } from 'react'
import { getReportData, getDetailReport } from '@/actions/dochadzka-reporty'
import { generateMesacnyVykazPDF } from '@/lib/pdf-dochadzka'
import MesacnyVykaz from './MesacnyVykaz'
import FajcenieReport from './FajcenieReport'
import NadcasyReport from './NadcasyReport'
import ExportMzdy from './ExportMzdy'

type Tab = 'vykaz' | 'fajcenie' | 'nadcasy' | 'export'

export default function ReportyPage() {
  const now = new Date()
  const [mesiac, setMesiac] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [tab, setTab] = useState<Tab>('vykaz')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getReportData(mesiac)
      setData(result.data || [])
      setLoading(false)
    }
    load()
  }, [mesiac])

  async function handleExportPDF(userId: string) {
    const detail = await getDetailReport(userId, mesiac)
    generateMesacnyVykazPDF(
      detail.profile.full_name,
      mesiac,
      detail.profile.pracovny_fond_hodiny || 8.5,
      detail.dni,
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'vykaz', label: 'Mesačný výkaz' },
    { id: 'fajcenie', label: 'Fajčenie' },
    { id: 'nadcasy', label: 'Nadčasy' },
    { id: 'export', label: 'Export' },
  ]

  if (loading) return <div className="text-gray-500 p-8">Načítavam...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reporty dochádzky</h2>
        <input type="month" value={mesiac} onChange={e => setMesiac(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'vykaz' && <MesacnyVykaz data={data} mesiac={mesiac} onExportPDF={handleExportPDF} />}
      {tab === 'fajcenie' && <FajcenieReport data={data} />}
      {tab === 'nadcasy' && <NadcasyReport data={data} />}
      {tab === 'export' && <ExportMzdy data={data} mesiac={mesiac} />}
    </div>
  )
}
