'use client'

import { useState } from 'react'
import DataTable, { type Column } from '@/components/ui/DataTable'
import type { VehicleCostRow, DriverKmRow } from '@/actions/fleet-reporty'
import { getNakladyPerVozidlo } from '@/actions/fleet-naklady'

interface VozidloOption {
  id: string
  spz: string
  znacka: string
  variant: string
}

interface Props {
  costData: VehicleCostRow[]
  driverData: DriverKmRow[]
  vozidla?: VozidloOption[]
}

const tabs = [
  { key: 'naklady', label: 'Náklady vozidiel' },
  { key: 'km', label: 'Kilometre vodičov' },
  { key: 'per_vozidlo', label: 'Náklady per vozidlo' },
] as const

type TabKey = (typeof tabs)[number]['key']

const costColumns: Column<VehicleCostRow>[] = [
  { key: 'vozidlo_label', label: 'Vozidlo', sortable: true },
  {
    key: 'servisy_eur',
    label: 'Servisy (€)',
    sortable: true,
    className: 'text-right',
    render: (item) => item.servisy_eur.toLocaleString('sk-SK', { minimumFractionDigits: 2 }),
  },
  {
    key: 'kontroly_eur',
    label: 'Kontroly (€)',
    sortable: true,
    className: 'text-right',
    render: (item) => item.kontroly_eur.toLocaleString('sk-SK', { minimumFractionDigits: 2 }),
  },
  {
    key: 'celkom_eur',
    label: 'Celkom (€)',
    sortable: true,
    className: 'text-right font-semibold',
    render: (item) => item.celkom_eur.toLocaleString('sk-SK', { minimumFractionDigits: 2 }),
  },
  {
    key: 'km',
    label: 'KM',
    sortable: true,
    className: 'text-right',
    render: (item) => item.km.toLocaleString('sk-SK'),
  },
  {
    key: 'eur_per_km',
    label: '€/km',
    sortable: true,
    className: 'text-right',
    render: (item) => item.eur_per_km.toLocaleString('sk-SK', { minimumFractionDigits: 2 }),
  },
]

const driverColumns: Column<DriverKmRow>[] = [
  { key: 'vodic_meno', label: 'Vodič', sortable: true },
  { key: 'vozidlo_spz', label: 'Vozidlo (SPZ)', sortable: true },
  {
    key: 'pocet_jazd',
    label: 'Počet jázd',
    sortable: true,
    className: 'text-right',
    render: (item) => item.pocet_jazd.toLocaleString('sk-SK'),
  },
  {
    key: 'celkom_km',
    label: 'Celkom KM',
    sortable: true,
    className: 'text-right',
    render: (item) => item.celkom_km.toLocaleString('sk-SK'),
  },
  {
    key: 'priemer_km',
    label: 'Priemer km/jazda',
    sortable: true,
    className: 'text-right',
    render: (item) => item.priemer_km.toLocaleString('sk-SK', { minimumFractionDigits: 1 }),
  },
]

interface NakladyData {
  servisy: number
  tankovanie: number
  kontroly: number
  poistne: number
}

function NakladyPerVozidloSection({ vozidla }: { vozidla: VozidloOption[] }) {
  const [selectedVozidlo, setSelectedVozidlo] = useState('')
  const [rok, setRok] = useState(new Date().getFullYear())
  const [data, setData] = useState<NakladyData | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadData() {
    if (!selectedVozidlo) return
    setLoading(true)
    const result = await getNakladyPerVozidlo(selectedVozidlo, rok)
    if ('data' in result) {
      setData(result.data)
    }
    setLoading(false)
  }

  const total = data ? data.servisy + data.tankovanie + data.kontroly + data.poistne : 0
  const maxVal = data ? Math.max(data.servisy, data.tankovanie, data.kontroly, data.poistne, 1) : 1

  const categories = data ? [
    { label: 'Servisy', value: data.servisy, color: 'bg-blue-500' },
    { label: 'Tankovanie', value: data.tankovanie, color: 'bg-green-500' },
    { label: 'Kontroly', value: data.kontroly, color: 'bg-orange-500' },
    { label: 'Poistné udalosti', value: data.poistne, color: 'bg-red-500' },
  ] : []

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Vozidlo</label>
          <select
            value={selectedVozidlo}
            onChange={e => setSelectedVozidlo(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Vyberte vozidlo...</option>
            {vozidla.map(v => (
              <option key={v.id} value={v.id}>{v.spz} — {v.znacka} {v.variant}</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rok</label>
          <select
            value={rok}
            onChange={e => setRok(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={loadData}
          disabled={!selectedVozidlo || loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Načítavam...' : 'Zobraziť'}
        </button>
      </div>

      {data && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">Kategória</th>
                <th className="pb-2 font-medium text-right">Suma (EUR)</th>
                <th className="pb-2 font-medium w-1/2"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.label} className="border-b border-gray-100">
                  <td className="py-3 font-medium">{cat.label}</td>
                  <td className="py-3 text-right font-mono">
                    {cat.value.toLocaleString('sk-SK', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 pl-4">
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                        style={{ width: `${maxVal > 0 ? (cat.value / maxVal) * 100 : 0}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-3">SPOLU</td>
                <td className="py-3 text-right font-mono">
                  {total.toLocaleString('sk-SK', { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function FleetReporty({ costData, driverData, vozidla = [] }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('naklady')

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'naklady' && (
        <DataTable
          data={costData}
          columns={costColumns}
          searchable
          searchPlaceholder="Hľadať vozidlo..."
          rowKey={(item) => item.vozidlo_id}
          exportFilename="fleet-naklady-vozidiel"
          emptyMessage="Žiadne dáta o nákladoch."
        />
      )}

      {activeTab === 'km' && (
        <DataTable
          data={driverData}
          columns={driverColumns}
          searchable
          searchPlaceholder="Hľadať vodiča..."
          rowKey={(item) => item.user_id}
          exportFilename="fleet-kilometre-vodicov"
          emptyMessage="Žiadne dáta o jazdách."
        />
      )}

      {activeTab === 'per_vozidlo' && (
        <NakladyPerVozidloSection vozidla={vozidla} />
      )}
    </div>
  )
}
