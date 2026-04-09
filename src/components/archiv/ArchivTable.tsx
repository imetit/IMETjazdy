// src/components/archiv/ArchivTable.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, FileText } from 'lucide-react'
import type { DokumentArchiv, TypDokumentuArchiv, StavDokumentuArchiv } from '@/lib/archiv-types'
import { TYP_DOKUMENTU_ARCHIV_LABELS, STAV_DOKUMENTU_ARCHIV_LABELS, STAV_DOKUMENTU_ARCHIV_COLORS } from '@/lib/archiv-types'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import { getAllDokumenty } from '@/actions/archiv'
import { useRouter } from 'next/navigation'

interface Props {
  dokumenty: DokumentArchiv[]
}

export default function ArchivTable({ dokumenty: initialData }: Props) {
  const [dokumenty, setDokumenty] = useState(initialData)
  const [typFilter, setTypFilter] = useState('')
  const [stavFilter, setStavFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleFilter() {
    setLoading(true)
    const result = await getAllDokumenty({
      typ: typFilter || undefined,
      stav: stavFilter || undefined,
      search: search || undefined,
    })
    setDokumenty((result.data as DokumentArchiv[]) || [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Archív dokumentov</h2>
        <Link href="/admin/archiv/nahrat" className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nahrať dokument
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Hľadať</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFilter()}
                placeholder="Názov, dodávateľ, číslo faktúry..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Typ</label>
            <select value={typFilter} onChange={e => setTypFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Všetky</option>
              {(Object.keys(TYP_DOKUMENTU_ARCHIV_LABELS) as TypDokumentuArchiv[]).map(t => (
                <option key={t} value={t}>{TYP_DOKUMENTU_ARCHIV_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stav</label>
            <select value={stavFilter} onChange={e => setStavFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Všetky</option>
              {(Object.keys(STAV_DOKUMENTU_ARCHIV_LABELS) as StavDokumentuArchiv[]).map(s => (
                <option key={s} value={s}>{STAV_DOKUMENTU_ARCHIV_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <button onClick={handleFilter} disabled={loading} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
            {loading ? '...' : 'Filtrovať'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Názov</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 font-medium">Dodávateľ</th>
              <th className="px-4 py-3 font-medium">Suma</th>
              <th className="px-4 py-3 font-medium">Splatnosť</th>
              <th className="px-4 py-3 font-medium">Stav</th>
              <th className="px-4 py-3 font-medium">Dátum</th>
            </tr>
          </thead>
          <tbody>
            {dokumenty.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Žiadne dokumenty</td></tr>}
            {dokumenty.map(d => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/archiv/${d.id}`)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    <span className="font-medium text-primary">{d.nazov}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{TYP_DOKUMENTU_ARCHIV_LABELS[d.typ]}</td>
                <td className="px-4 py-3 text-gray-600">{d.dodavatel || '—'}</td>
                <td className="px-4 py-3">{d.suma ? formatCurrency(d.suma) : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{d.datum_splatnosti ? formatDate(d.datum_splatnosti) : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STAV_DOKUMENTU_ARCHIV_COLORS[d.stav]}`}>
                    {STAV_DOKUMENTU_ARCHIV_LABELS[d.stav]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(d.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
