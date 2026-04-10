'use client'

import { useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import type { Column, FilterDef } from '@/components/ui/DataTable'
import StatusBadge from '@/components/StatusBadge'
import type { Jazda, JazdaStav } from '@/lib/types'

type JazdaRow = Jazda & { profile: { full_name: string } }

const columns: Column<JazdaRow>[] = [
  {
    key: 'cislo_dokladu',
    label: 'Č. dokladu',
    sortable: true,
    render: (j) => <span className="font-mono text-gray-700">{j.cislo_dokladu || '—'}</span>,
  },
  {
    key: 'profile',
    label: 'Zamestnanec',
    sortable: true,
    render: (j) => <span className="font-medium text-gray-900">{j.profile?.full_name}</span>,
  },
  {
    key: 'mesiac',
    label: 'Mesiac',
    sortable: true,
  },
  {
    key: 'trasa',
    label: 'Trasa',
    render: (j) => <span>{j.odchod_z}{j.cez ? ` → ${j.cez}` : ''} → {j.prichod_do}</span>,
  },
  {
    key: 'km',
    label: 'KM',
    sortable: true,
    className: 'text-right',
    render: (j) => <span className="text-gray-900">{j.km}</span>,
  },
  {
    key: 'stav',
    label: 'Stav',
    render: (j) => <StatusBadge stav={j.stav as JazdaStav} />,
  },
  {
    key: 'naklady_celkom',
    label: 'Celkom (€)',
    sortable: true,
    className: 'text-right',
    render: (j) => (
      <span className="font-semibold text-primary">
        {j.naklady_celkom ? Number(j.naklady_celkom).toFixed(2) : '—'}
      </span>
    ),
  },
  {
    key: 'created_at',
    label: 'Dátum',
    sortable: true,
    render: (j) => (
      <span className="text-gray-500">
        {new Date(j.created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </span>
    ),
  },
]

const filters: FilterDef[] = [
  {
    key: 'stav',
    label: 'Stav',
    options: [
      { value: 'rozpracovana', label: 'Rozpracovaná' },
      { value: 'odoslana', label: 'Odoslaná' },
      { value: 'spracovana', label: 'Spracovaná' },
    ],
  },
]

export default function AdminJazdyTable({ jazdy }: { jazdy: JazdaRow[] }) {
  const router = useRouter()

  return (
    <DataTable
      data={jazdy}
      columns={columns}
      searchable
      searchPlaceholder="Hľadať podľa mena, SPZ, trasy..."
      filters={filters}
      pageSize={25}
      emptyMessage="Žiadne jazdy."
      rowKey={(j) => j.id}
      onRowClick={(j) => router.push(`/admin/jazdy/${j.id}`)}
    />
  )
}
