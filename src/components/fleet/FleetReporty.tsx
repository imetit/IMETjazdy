'use client'

import { useState } from 'react'
import DataTable, { type Column } from '@/components/ui/DataTable'
import type { VehicleCostRow, DriverKmRow } from '@/actions/fleet-reporty'

interface Props {
  costData: VehicleCostRow[]
  driverData: DriverKmRow[]
}

const tabs = [
  { key: 'naklady', label: 'Náklady vozidiel' },
  { key: 'km', label: 'Kilometre vodičov' },
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

export default function FleetReporty({ costData, driverData }: Props) {
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
    </div>
  )
}
