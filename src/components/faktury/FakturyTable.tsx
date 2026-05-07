'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Plus, Search, Filter, AlertTriangle, Clock, CheckCircle2, Banknote, Ban } from 'lucide-react'
import type { Faktura, FakturaStav } from '@/lib/faktury-types'
import { FAKTURA_STAV_LABELS, FAKTURA_STAV_COLORS, formatSuma } from '@/lib/faktury-types'

interface FakturaRow extends Faktura {
  firma?: { kod: string; nazov: string }
  nahral?: { full_name: string }
}

export default function FakturyTable({ initialData, defaultStav = 'all', defaultOverdue = false }: {
  initialData: FakturaRow[]
  defaultStav?: FakturaStav | 'all'
  defaultOverdue?: boolean
}) {
  const [stavFilter, setStavFilter] = useState<FakturaStav | 'all'>(defaultStav)
  const [overdue, setOverdue] = useState(defaultOverdue)
  const [search, setSearch] = useState('')

  const swrKey = `/api/admin/faktury?stav=${stavFilter}${overdue ? '&overdue=1' : ''}`
  const { data, mutate } = useSWR<{ data: FakturaRow[] }>(swrKey, { fallbackData: { data: initialData } })
  const rows = data?.data || initialData

  const today = new Date().toISOString().split('T')[0]

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return rows.filter(r => {
      if (s && !`${r.cislo_faktury} ${r.dodavatel_nazov} ${r.popis || ''}`.toLowerCase().includes(s)) return false
      return true
    })
  }, [rows, search])

  const kpi = useMemo(() => {
    const cakaju = rows.filter(r => r.stav === 'caka_na_schvalenie').length
    const naUhradu = rows.filter(r => r.stav === 'na_uhradu').length
    const overdueN = rows.filter(r => ['schvalena', 'na_uhradu'].includes(r.stav) && r.datum_splatnosti < today).length
    const sumMesiac = rows
      .filter(r => r.datum_splatnosti.slice(0, 7) === today.slice(0, 7))
      .reduce((s, r) => s + Math.abs(Number(r.suma_celkom_eur || 0)), 0)
    return { cakaju, naUhradu, overdueN, sumMesiac }
  }, [rows, today])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Faktúry</h2>
        <Link href="/admin/faktury/nahrat" className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90">
          <Plus size={18} /> Nahrať faktúru
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Clock} label="Čakajú na schválenie" value={kpi.cakaju} color="text-orange-600 bg-orange-50" onClick={() => setStavFilter('caka_na_schvalenie')} />
        <KpiCard icon={Banknote} label="Na úhradu" value={kpi.naUhradu} color="text-blue-600 bg-blue-50" onClick={() => setStavFilter('na_uhradu')} />
        <KpiCard icon={AlertTriangle} label="Po splatnosti" value={kpi.overdueN} color="text-red-600 bg-red-50" onClick={() => { setStavFilter('all'); setOverdue(true) }} />
        <KpiCard icon={CheckCircle2} label="Tento mesiac" value={`${kpi.sumMesiac.toFixed(0)} €`} color="text-teal-600 bg-teal-50" onClick={() => {}} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať..." className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg w-full text-sm" />
          </div>
          <select value={stavFilter} onChange={e => setStavFilter(e.target.value as FakturaStav | 'all')} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="all">Všetky stavy</option>
            {Object.entries(FAKTURA_STAV_LABELS).map(([s, label]) => <option key={s} value={s}>{label}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={overdue} onChange={e => setOverdue(e.target.checked)} />
            Iba po splatnosti
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Číslo</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Dodávateľ</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600">Suma</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Splatnosť</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Stav</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Firma</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isOverdue = ['schvalena', 'na_uhradu'].includes(r.stav) && r.datum_splatnosti < today
                return (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/faktury/${r.id}`} className="text-primary hover:underline font-medium">
                        {r.je_dobropis && <Ban size={12} className="inline mr-1 text-orange-500" />}
                        {r.cislo_faktury}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{r.dodavatel_nazov}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatSuma(r.suma_celkom, r.mena)}
                      {r.mena !== 'EUR' && r.suma_celkom_eur != null && (
                        <span className="text-xs text-gray-400 ml-1">({r.suma_celkom_eur.toFixed(2)} €)</span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                      {r.datum_splatnosti}
                      {isOverdue && <AlertTriangle size={12} className="inline ml-1" />}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FAKTURA_STAV_COLORS[r.stav]}`}>
                        {FAKTURA_STAV_LABELS[r.stav]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{r.firma?.kod || '—'}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">Žiadne faktúry</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, color, onClick }: {
  icon: React.ComponentType<{ size?: number }>
  label: string; value: number | string; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${color}`}><Icon size={18} /></div>
      </div>
    </button>
  )
}
