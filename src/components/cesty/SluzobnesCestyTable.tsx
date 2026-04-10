// src/components/cesty/SluzobnesCestyTable.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import type { SluzobnasCesta } from '@/lib/cesty-types'
import { DOPRAVA_LABELS, STAV_CESTY_LABELS, STAV_CESTY_COLORS } from '@/lib/cesty-types'
import { schvalCestu, zamietniCestu } from '@/actions/sluzobne-cesty'
import { formatDate } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import type { Column, FilterDef } from '@/components/ui/DataTable'

interface Props {
  cesty: SluzobnasCesta[]
}

export default function SluzobnesCestyTable({ cesty }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSchval(id: string) {
    setLoading(true)
    const result = await schvalCestu(id)
    if (result && 'error' in result && result.error) alert(result.error)
    setLoading(false)
    router.refresh()
  }

  async function handleZamietni(id: string) {
    setLoading(true)
    const result = await zamietniCestu(id)
    if (result && 'error' in result && result.error) alert(result.error)
    setLoading(false)
    router.refresh()
  }

  const columns: Column<SluzobnasCesta>[] = [
    {
      key: 'profile',
      label: 'Zamestnanec',
      sortable: true,
      render: (c) => <span className="font-medium">{(c as any).profile?.full_name || '—'}</span>,
    },
    {
      key: 'datum_od',
      label: 'Obdobie',
      sortable: true,
      render: (c) => <span>{formatDate(c.datum_od)} — {formatDate(c.datum_do)}</span>,
    },
    {
      key: 'ciel',
      label: 'Cieľ',
      sortable: true,
    },
    {
      key: 'ucel',
      label: 'Účel',
      render: (c) => <span className="text-gray-500 max-w-xs truncate block">{c.ucel}</span>,
    },
    {
      key: 'doprava',
      label: 'Doprava',
      render: (c) => <span className="text-gray-500">{DOPRAVA_LABELS[c.doprava]}</span>,
    },
    {
      key: 'stav',
      label: 'Stav',
      render: (c) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STAV_CESTY_COLORS[c.stav]}`}>
          {STAV_CESTY_LABELS[c.stav]}
        </span>
      ),
    },
    {
      key: 'akcie',
      label: 'Akcie',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-2">
          {c.stav === 'nova' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleSchval(c.id) }} disabled={loading} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Schváliť">
                <Check size={16} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleZamietni(c.id) }} disabled={loading} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Zamietnuť">
                <X size={16} />
              </button>
            </>
          )}
          <Link href={`/admin/sluzobne-cesty/${c.id}`} onClick={(e) => e.stopPropagation()} className="p-1.5 text-primary hover:bg-teal-50 rounded text-xs font-medium">
            Detail
          </Link>
        </div>
      ),
    },
  ]

  const filters: FilterDef[] = [
    {
      key: 'stav',
      label: 'Stav',
      options: [
        { value: 'nova', label: 'Nové' },
        { value: 'schvalena', label: 'Schválené' },
        { value: 'ukoncena', label: 'Ukončené' },
        { value: 'zamietnuta', label: 'Zamietnuté' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Služobné cesty</h2>
      <DataTable
        data={cesty}
        columns={columns}
        searchable
        searchPlaceholder="Hľadať podľa mena, cieľa..."
        filters={filters}
        pageSize={25}
        exportFilename="sluzobne-cesty-export"
        emptyMessage="Žiadne záznamy."
        rowKey={(c) => c.id}
      />
    </div>
  )
}
