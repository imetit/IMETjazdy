'use client'

import { useState } from 'react'
import DataTable from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import type { ZamestnanecJazdyReport } from '@/actions/jazdy-reporty'
import { getMesacnyJazdyReport, getRocnyJazdyReport } from '@/actions/jazdy-reporty'
import { getReportData } from '@/actions/dochadzka-reporty'
import { formatMinutyNaHodiny } from '@/lib/dochadzka-utils'

interface DochadzkaReport {
  id: string
  full_name: string
  pracovny_fond_hodiny: number
  odpracovane_min: number
  fond_min: number
  rozdiel_min: number
  fajcenie_min: number
  dni_dochadzka: number
}

interface RocnyReport {
  mesiac: string
  pocet: number
  km: number
  naklady: number
}

interface Props {
  initialMesiac: string
  jazdyData: ZamestnanecJazdyReport[]
  dochadzkaData: DochadzkaReport[]
  rocnyData: RocnyReport[]
}

type Tab = 'jazdy' | 'dochadzka' | 'rocny'

export default function AdminReporty({ initialMesiac, jazdyData, dochadzkaData, rocnyData }: Props) {
  const [tab, setTab] = useState<Tab>('jazdy')
  const [mesiac, setMesiac] = useState(initialMesiac)
  const [jazdy, setJazdy] = useState(jazdyData)
  const [dochadzka, setDochadzka] = useState(dochadzkaData)
  const [rocny, setRocny] = useState(rocnyData)
  const [loading, setLoading] = useState(false)

  async function handleMesiacChange(newMesiac: string) {
    setMesiac(newMesiac)
    setLoading(true)
    const [jr, dr] = await Promise.all([
      getMesacnyJazdyReport(newMesiac),
      getReportData(newMesiac),
    ])
    setJazdy(jr.data || [])
    setDochadzka(dr.data || [])
    const rok = parseInt(newMesiac.split('-')[0])
    const rr = await getRocnyJazdyReport(rok)
    setRocny(rr.data || [])
    setLoading(false)
  }

  const jazdyColumns: Column<ZamestnanecJazdyReport>[] = [
    { key: 'full_name', label: 'Zamestnanec', sortable: true, render: (r) => <span className="font-medium">{r.full_name}</span> },
    { key: 'pocet_jazd', label: 'Jázd', sortable: true, className: 'text-right' },
    { key: 'celkom_km', label: 'KM', sortable: true, className: 'text-right', render: (r) => <span>{r.celkom_km.toLocaleString('sk-SK')}</span> },
    { key: 'spracovane', label: 'Spracované', sortable: true, className: 'text-right' },
    { key: 'odoslane', label: 'Čaká', sortable: true, className: 'text-right', render: (r) => r.odoslane > 0 ? <span className="text-orange-600 font-medium">{r.odoslane}</span> : <span>0</span> },
    { key: 'celkom_naklady', label: 'Náklady (€)', sortable: true, className: 'text-right', render: (r) => <span className="font-semibold text-primary">{r.celkom_naklady > 0 ? r.celkom_naklady.toFixed(2) : '—'}</span> },
  ]

  const dochadzkaColumns: Column<DochadzkaReport>[] = [
    { key: 'full_name', label: 'Zamestnanec', sortable: true, render: (r) => <span className="font-medium">{r.full_name}</span> },
    { key: 'dni_dochadzka', label: 'Dní', sortable: true, className: 'text-right' },
    { key: 'odpracovane_min', label: 'Odpracované', sortable: true, className: 'text-right', render: (r) => <span>{Math.floor(r.odpracovane_min / 60)}h {r.odpracovane_min % 60}m</span> },
    { key: 'fond_min', label: 'Fond', sortable: true, className: 'text-right', render: (r) => <span>{Math.floor(r.fond_min / 60)}h</span> },
    { key: 'rozdiel_min', label: 'Rozdiel', sortable: true, className: 'text-right', render: (r) => <span className={r.rozdiel_min >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{formatMinutyNaHodiny(r.rozdiel_min)}</span> },
    { key: 'fajcenie_min', label: 'Fajčenie', sortable: true, className: 'text-right', render: (r) => r.fajcenie_min > 0 ? <span className="text-orange-600">{r.fajcenie_min}min</span> : <span>—</span> },
  ]

  const rocnyColumns: Column<RocnyReport>[] = [
    { key: 'mesiac', label: 'Mesiac', sortable: true },
    { key: 'pocet', label: 'Počet jázd', sortable: true, className: 'text-right' },
    { key: 'km', label: 'KM', sortable: true, className: 'text-right', render: (r) => <span>{r.km.toLocaleString('sk-SK')}</span> },
    { key: 'naklady', label: 'Náklady (€)', sortable: true, className: 'text-right', render: (r) => <span className="font-semibold text-primary">{r.naklady.toFixed(2)}</span> },
  ]

  const tabs: { key: Tab; label: string }[] = [
    { key: 'jazdy', label: 'Náklady jázd' },
    { key: 'dochadzka', label: 'Dochádzka' },
    { key: 'rocny', label: 'Ročný prehľad' },
  ]

  // Totals
  const jazdyCelkom = jazdy.reduce((s, r) => s + r.celkom_naklady, 0)
  const jazdyKm = jazdy.reduce((s, r) => s + r.celkom_km, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Reporty</h2>
        <input
          type="month"
          value={mesiac}
          onChange={e => handleMesiacChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-500 p-4">Načítavam...</div>}

      {!loading && tab === 'jazdy' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Celkom jázd</p>
              <p className="text-2xl font-bold">{jazdy.reduce((s, r) => s + r.pocet_jazd, 0)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Celkom KM</p>
              <p className="text-2xl font-bold">{jazdyKm.toLocaleString('sk-SK')}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Celkom náklady</p>
              <p className="text-2xl font-bold text-primary">{jazdyCelkom.toFixed(2)} €</p>
            </div>
          </div>
          <DataTable
            data={jazdy}
            columns={jazdyColumns}
            searchable
            searchPlaceholder="Hľadať zamestnanca..."
            exportFilename={`jazdy-report-${mesiac}`}
            emptyMessage="Žiadne jazdy v tomto mesiaci."
            rowKey={(r) => r.id}
          />
        </div>
      )}

      {!loading && tab === 'dochadzka' && (
        <DataTable
          data={dochadzka}
          columns={dochadzkaColumns}
          searchable
          searchPlaceholder="Hľadať zamestnanca..."
          exportFilename={`dochadzka-report-${mesiac}`}
          emptyMessage="Žiadne údaje o dochádzke."
          rowKey={(r) => r.id}
        />
      )}

      {!loading && tab === 'rocny' && (
        <DataTable
          data={rocny}
          columns={rocnyColumns}
          exportFilename={`rocny-report-${mesiac.split('-')[0]}`}
          emptyMessage="Žiadne spracované jazdy."
          rowKey={(r) => r.mesiac}
        />
      )}
    </div>
  )
}
