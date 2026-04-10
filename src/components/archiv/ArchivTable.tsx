// src/components/archiv/ArchivTable.tsx
'use client'

import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import type { DokumentArchiv, TypDokumentuArchiv, StavDokumentuArchiv } from '@/lib/archiv-types'
import { TYP_DOKUMENTU_ARCHIV_LABELS, STAV_DOKUMENTU_ARCHIV_LABELS, STAV_DOKUMENTU_ARCHIV_COLORS } from '@/lib/archiv-types'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import type { Column, FilterDef } from '@/components/ui/DataTable'

interface Props {
  dokumenty: DokumentArchiv[]
}

export default function ArchivTable({ dokumenty }: Props) {
  const router = useRouter()

  const columns: Column<DokumentArchiv>[] = [
    {
      key: 'nazov',
      label: 'Názov',
      sortable: true,
      render: (d) => (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-gray-400" />
          <span className="font-medium text-primary">{d.nazov}</span>
        </div>
      ),
    },
    {
      key: 'typ',
      label: 'Typ',
      render: (d) => <span>{TYP_DOKUMENTU_ARCHIV_LABELS[d.typ]}</span>,
    },
    {
      key: 'dodavatel',
      label: 'Dodávateľ',
      sortable: true,
      render: (d) => <span className="text-gray-600">{d.dodavatel || '—'}</span>,
    },
    {
      key: 'suma',
      label: 'Suma',
      sortable: true,
      render: (d) => <span>{d.suma ? formatCurrency(d.suma) : '—'}</span>,
    },
    {
      key: 'datum_splatnosti',
      label: 'Splatnosť',
      sortable: true,
      render: (d) => <span className="text-gray-500">{d.datum_splatnosti ? formatDate(d.datum_splatnosti) : '—'}</span>,
    },
    {
      key: 'stav',
      label: 'Stav',
      render: (d) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STAV_DOKUMENTU_ARCHIV_COLORS[d.stav]}`}>
          {STAV_DOKUMENTU_ARCHIV_LABELS[d.stav]}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Dátum',
      sortable: true,
      render: (d) => <span className="text-gray-500">{formatDate(d.created_at)}</span>,
    },
  ]

  const typOptions = (Object.keys(TYP_DOKUMENTU_ARCHIV_LABELS) as TypDokumentuArchiv[]).map(t => ({
    value: t,
    label: TYP_DOKUMENTU_ARCHIV_LABELS[t],
  }))

  const stavOptions = (Object.keys(STAV_DOKUMENTU_ARCHIV_LABELS) as StavDokumentuArchiv[]).map(s => ({
    value: s,
    label: STAV_DOKUMENTU_ARCHIV_LABELS[s],
  }))

  const filters: FilterDef[] = [
    { key: 'typ', label: 'Typ', options: typOptions },
    { key: 'stav', label: 'Stav', options: stavOptions },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Archív dokumentov</h2>
        <Link href="/admin/archiv/nahrat" className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nahrať dokument
        </Link>
      </div>
      <DataTable
        data={dokumenty}
        columns={columns}
        searchable
        searchPlaceholder="Hľadať podľa názvu, dodávateľa, č. faktúry..."
        filters={filters}
        pageSize={25}
        emptyMessage="Žiadne dokumenty."
        rowKey={(d) => d.id}
        onRowClick={(d) => router.push(`/admin/archiv/${d.id}`)}
      />
    </div>
  )
}
