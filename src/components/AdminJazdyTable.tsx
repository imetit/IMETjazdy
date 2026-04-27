'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Square, Loader2, X } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import type { Column, FilterDef } from '@/components/ui/DataTable'
import StatusBadge from '@/components/StatusBadge'
import type { Jazda, JazdaStav } from '@/lib/types'
import { batchProcessJazdy, batchRejectJazdy } from '@/actions/jazdy-batch'

type JazdaRow = Jazda & { profile: { full_name: string } }

export default function AdminJazdyTable({ jazdy }: { jazdy: JazdaRow[] }) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const eligibleIds = jazdy.filter((j) => j.stav === 'odoslana').map((j) => j.id)
  const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedIds.includes(id))

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function toggleAll() {
    if (allEligibleSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(eligibleIds)
    }
  }

  async function handleBatchProcess() {
    if (selectedIds.length === 0) return
    setLoading(true)
    try {
      await batchProcessJazdy(selectedIds)
      setSelectedIds([])
      router.refresh()
    } catch {
      alert('Chyba pri hromadnom spracovaní')
    } finally {
      setLoading(false)
    }
  }

  async function handleBatchReject() {
    if (selectedIds.length === 0 || !rejectReason.trim()) return
    setLoading(true)
    try {
      await batchRejectJazdy(selectedIds, rejectReason.trim())
      setSelectedIds([])
      setShowRejectModal(false)
      setRejectReason('')
      router.refresh()
    } catch {
      alert('Chyba pri hromadnom vrátení')
    } finally {
      setLoading(false)
    }
  }

  const checkboxColumn: Column<JazdaRow> = {
    key: '_select',
    label: '',
    className: 'w-12',
    headerClassName: 'w-12',
    headerRender: () => (
      <div className="flex items-center justify-start h-[18px]">
        {eligibleIds.length === 0 ? (
          <span className="block w-[18px] h-[18px]" />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleAll()
            }}
            className="flex items-center justify-center p-0 m-0 border-0 bg-transparent leading-none text-gray-500 hover:text-primary transition-colors cursor-pointer"
            title={allEligibleSelected ? 'Zrušiť výber' : 'Vybrať všetky odoslané'}
          >
            {allEligibleSelected
              ? <CheckSquare size={18} className="text-primary block" />
              : <Square size={18} className="block" />}
          </button>
        )}
      </div>
    ),
    render: (j) => {
      const eligible = j.stav === 'odoslana'
      const checked = selectedIds.includes(j.id)
      return (
        <div className="flex items-center justify-start h-[18px]">
          {!eligible ? (
            <span className="block w-[18px] h-[18px]" />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleSelect(j.id)
              }}
              className="flex items-center justify-center p-0 m-0 border-0 bg-transparent leading-none text-gray-500 hover:text-primary transition-colors cursor-pointer"
            >
              {checked
                ? <CheckSquare size={18} className="text-primary block" />
                : <Square size={18} className="block" />}
            </button>
          )}
        </div>
      )
    },
  }

  const columns: Column<JazdaRow>[] = [
    checkboxColumn,
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

  return (
    <div>
      <DataTable
        data={jazdy}
        columns={columns}
        searchable
        searchPlaceholder="Hľadať podľa mena, SPZ, trasy..."
        filters={filters}
        pageSize={25}
        exportFilename="jazdy-export"
        emptyMessage="Žiadne jazdy."
        rowKey={(j) => j.id}
        onRowClick={(j) => router.push(`/admin/jazdy/${j.id}`)}
      />

      {/* Floating action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm text-gray-600 font-medium">
            Vybraných: <span className="text-primary font-bold">{selectedIds.length}</span>
          </span>
          <button
            onClick={handleBatchProcess}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Spracovať vybrané
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            Vrátiť vybrané
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            title="Zrušiť výber"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Vrátiť jazdy na doplnenie</h3>
            <p className="text-sm text-gray-500 mb-4">
              Vrátených bude {selectedIds.length} jázd. Zadajte dôvod vrátenia:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Dôvod vrátenia..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                disabled={loading}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleBatchReject}
                disabled={loading || !rejectReason.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Potvrdiť vrátenie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
