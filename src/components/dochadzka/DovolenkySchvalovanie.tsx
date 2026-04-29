// src/components/dochadzka/DovolenkySchvalovanie.tsx
'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import type { Dovolenka } from '@/lib/dovolenka-types'
import { TYP_DOVOLENKY_LABELS, STAV_DOVOLENKY_LABELS, STAV_DOVOLENKY_COLORS } from '@/lib/dovolenka-types'
import { schvalDovolenku, zamietniDovolenku } from '@/actions/dovolenky'
import { formatDate } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'
import Modal from '@/components/Modal'
import DataTable from '@/components/ui/DataTable'
import type { Column, FilterDef } from '@/components/ui/DataTable'

interface Props {
  dovolenky: Dovolenka[]
}

export default function DovolenkySchvalovanie({ dovolenky: initial }: Props) {
  const [dovolenky, setDovolenky] = useState<Dovolenka[]>(initial)
  const [zamietnutieId, setZamietnutieId] = useState<string | null>(null)
  const [dovod, setDovod] = useState('')
  const [pending, startTransition] = useTransition()
  const loading = pending
  const router = useRouter()

  async function handleSchval(id: string) {
    // Optimistic UI — okamžite update lokálneho state-u
    const prev = dovolenky
    setDovolenky(d => d.map(x => x.id === id ? { ...x, stav: 'schvalena', schvalene_at: new Date().toISOString() } : x))

    startTransition(async () => {
      const result = await schvalDovolenku(id)
      if (result && 'error' in result && result.error) {
        setDovolenky(prev) // revert
        alert(result.error)
      } else {
        router.refresh() // refresh to load auto-attendance + counts
      }
    })
  }

  async function handleZamietni() {
    if (!zamietnutieId || !dovod.trim()) return
    const id = zamietnutieId
    const reason = dovod
    const prev = dovolenky

    // Optimistic UI
    setDovolenky(d => d.map(x => x.id === id ? { ...x, stav: 'zamietnuta', dovod_zamietnutia: reason } : x))
    setZamietnutieId(null)
    setDovod('')

    startTransition(async () => {
      const result = await zamietniDovolenku(id, reason)
      if (result && 'error' in result && result.error) {
        setDovolenky(prev)
        alert(result.error)
      } else {
        router.refresh()
      }
    })
  }

  const columns: Column<Dovolenka>[] = [
    {
      key: 'profile',
      label: 'Zamestnanec',
      sortable: true,
      render: (d) => <span className="font-medium">{(d as any).profile?.full_name || '—'}</span>,
    },
    {
      key: 'datum_od',
      label: 'Obdobie',
      sortable: true,
      render: (d) => <span>{formatDate(d.datum_od)} — {formatDate(d.datum_do)}</span>,
    },
    {
      key: 'typ',
      label: 'Typ',
      render: (d) => <span>{TYP_DOVOLENKY_LABELS[d.typ]}</span>,
    },
    {
      key: 'stav',
      label: 'Stav',
      render: (d) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STAV_DOVOLENKY_COLORS[d.stav]}`}>
          {STAV_DOVOLENKY_LABELS[d.stav]}
        </span>
      ),
    },
    {
      key: 'poznamka',
      label: 'Poznámka',
      render: (d) => <span className="text-gray-500 text-xs">{d.poznamka || '—'}</span>,
    },
    {
      key: 'akcie',
      label: 'Akcie',
      className: 'text-right',
      render: (d) => d.stav === 'caka_na_schvalenie' ? (
        <div className="flex justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleSchval(d.id) }} disabled={loading} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Schváliť">
            <Check size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setZamietnutieId(d.id) }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Zamietnuť">
            <X size={16} />
          </button>
        </div>
      ) : null,
    },
  ]

  const filters: FilterDef[] = [
    {
      key: 'stav',
      label: 'Stav',
      options: [
        { value: 'caka_na_schvalenie', label: 'Čakajúce' },
        { value: 'schvalena', label: 'Schválené' },
        { value: 'zamietnuta', label: 'Zamietnuté' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Schvaľovanie dovoleniek</h2>

      <DataTable
        data={dovolenky}
        columns={columns}
        searchable
        searchPlaceholder="Hľadať podľa mena..."
        filters={filters}
        pageSize={25}
        exportFilename="dovolenky-export"
        emptyMessage="Žiadne žiadosti."
        rowKey={(d) => d.id}
      />

      {zamietnutieId && (
        <Modal title="Zamietnutie dovolenky" onClose={() => setZamietnutieId(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dôvod zamietnutia *</label>
              <textarea value={dovod} onChange={e => setDovod(e.target.value)} rows={3} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Prečo sa žiadosť zamieta..." />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setZamietnutieId(null)} className="px-4 py-2 text-sm text-gray-600">Zrušiť</button>
              <button onClick={handleZamietni} disabled={!dovod.trim() || loading} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {loading ? 'Zamietnujem...' : 'Zamietnuť'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
