'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Clock } from 'lucide-react'
import Modal from '@/components/Modal'
import DataTable from '@/components/ui/DataTable'
import type { Column, FilterDef } from '@/components/ui/DataTable'
import { schvalitZiadost, zamietnutZiadost } from '@/actions/dochadzka-ziadosti'
import type { KorekciaZiadost } from '@/lib/dochadzka-types'
import { useToast } from '@/components/ui/Toast'

interface ZiadostRow extends KorekciaZiadost {
  profile?: { full_name: string; firma_id: string | null }
}

const STAV_LABELS: Record<string, string> = {
  caka_na_schvalenie: 'Čaká',
  schvalena: 'Schválená',
  zamietnuta: 'Zamietnutá',
}
const STAV_COLORS: Record<string, string> = {
  caka_na_schvalenie: 'bg-yellow-100 text-yellow-800',
  schvalena: 'bg-green-100 text-green-800',
  zamietnuta: 'bg-red-100 text-red-800',
}

export default function KorekciaZiadostiInbox({ ziadosti: initial }: { ziadosti: ZiadostRow[] }) {
  const [ziadosti, setZiadosti] = useState(initial)
  const [zamietId, setZamietId] = useState<string | null>(null)
  const [dovod, setDovod] = useState('')
  const [, startTransition] = useTransition()
  const router = useRouter()
  const toast = useToast()

  function handleSchvalit(id: string) {
    const prev = ziadosti
    setZiadosti(z => z.map(x => x.id === id ? { ...x, stav: 'schvalena' } : x))
    startTransition(async () => {
      const r = await schvalitZiadost(id)
      if (r && 'error' in r && r.error) { setZiadosti(prev); toast.error(r.error); return }
      router.refresh()
    })
  }

  function handleZamietnut() {
    if (!zamietId || !dovod.trim()) return
    const id = zamietId
    const reason = dovod
    const prev = ziadosti
    setZiadosti(z => z.map(x => x.id === id ? { ...x, stav: 'zamietnuta', poznamka_mzdarka: reason } : x))
    setZamietId(null); setDovod('')
    startTransition(async () => {
      const r = await zamietnutZiadost(id, reason)
      if (r && 'error' in r && r.error) { setZiadosti(prev); toast.error(r.error); return }
      router.refresh()
    })
  }

  const columns: Column<ZiadostRow>[] = [
    { key: 'created_at', label: 'Podaná', sortable: true,
      render: z => <span className="text-xs text-gray-500">{new Date(z.created_at).toLocaleString('sk-SK')}</span> },
    { key: 'profile', label: 'Zamestnanec', sortable: true,
      render: z => <span className="font-medium">{z.profile?.full_name || '—'}</span> },
    { key: 'datum', label: 'Dátum', sortable: true,
      render: z => <span className="font-mono">{z.datum}</span> },
    { key: 'poznamka_zamestnanec', label: 'Popis problému',
      render: z => <span className="text-sm text-gray-700 line-clamp-2">{z.poznamka_zamestnanec}</span> },
    { key: 'navrh', label: 'Návrh',
      render: z => z.navrh_cas
        ? <span className="text-xs">{z.navrh_smer} {z.navrh_dovod} {new Date(z.navrh_cas).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        : <span className="text-gray-400 text-xs">—</span> },
    { key: 'stav', label: 'Stav',
      render: z => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAV_COLORS[z.stav]}`}>{STAV_LABELS[z.stav]}</span> },
    { key: 'akcie', label: 'Akcie', className: 'text-right',
      render: z => z.stav === 'caka_na_schvalenie' ? (
        <div className="flex justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleSchvalit(z.id) }} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Schváliť">
            <Check size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setZamietId(z.id) }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Zamietnuť">
            <X size={16} />
          </button>
        </div>
      ) : null },
  ]

  const filters: FilterDef[] = [
    { key: 'stav', label: 'Stav',
      options: [
        { value: 'caka_na_schvalenie', label: 'Čakajúce' },
        { value: 'schvalena', label: 'Schválené' },
        { value: 'zamietnuta', label: 'Zamietnuté' },
      ] },
  ]

  return (
    <div>
      <DataTable
        data={ziadosti}
        columns={columns}
        searchable
        searchPlaceholder="Hľadať podľa mena…"
        filters={filters}
        rowKey={z => z.id}
        emptyMessage="Žiadne žiadosti."
      />

      {zamietId && (
        <Modal title="Zamietnutie žiadosti" onClose={() => { setZamietId(null); setDovod('') }}>
          <div className="space-y-4">
            <textarea value={dovod} onChange={e => setDovod(e.target.value)} rows={3} required
              placeholder="Dôvod zamietnutia *"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setZamietId(null); setDovod('') }} className="px-4 py-2 text-sm text-gray-600">Zrušiť</button>
              <button onClick={handleZamietnut} disabled={!dovod.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">
                Potvrdiť zamietnutie
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
