'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, AlertTriangle, Lock, Unlock, ChevronRight } from 'lucide-react'
import DochadzkaFiltre, { type FilterValues } from './DochadzkaFiltre'
import DochadzkaKPI from './DochadzkaKPI'
import MzdarkaTodoPanel from './MzdarkaTodoPanel'
import DataTable from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import type { MesacnySumar } from '@/lib/dochadzka-types'
import { getMesacneSumary, getVPraciDnes } from '@/actions/admin-dochadzka-mzdy'
import { schvalitHodinyZamestnanca, bulkSchvalitFirmu, spustitKontrolu, uzavrietMesiac } from '@/actions/dochadzka-uzavierka'
import { formatMinutyNaHodiny } from '@/lib/dochadzka-utils'

interface Props {
  firmy: Array<{ id: string; nazov: string; kod: string }>
  initialMesiac: string
  uzavierky: Array<{ firma_id: string; mesiac: string; stav: string }>
  initialSumary: MesacnySumar[]
  initialVPraci: Array<{ id: string; full_name: string; prichod_cas: string }>
}

export default function AdminDochadzkaClient({ firmy, initialMesiac, uzavierky, initialSumary, initialVPraci }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterValues>({
    mesiac: initialMesiac,
    firmaIds: [],
    status: 'all',
    search: '',
  })

  const [sumary, setSumary] = useState<MesacnySumar[]>(initialSumary)
  const [vPraci, setVPraci] = useState<Array<{ id: string; full_name: string; prichod_cas: string }>>(initialVPraci)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const isInitial = useRef(true)

  useEffect(() => {
    // Skip first render — initial data prišli z SSR
    if (isInitial.current) { isInitial.current = false; return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      getMesacneSumary(filter.mesiac, filter.firmaIds.length > 0 ? filter.firmaIds : undefined),
      getVPraciDnes(),
    ]).then(([sumResult, vpResult]) => {
      if (cancelled) return
      setSumary(sumResult.data || [])
      setVPraci(vpResult.data || [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [filter.mesiac, filter.firmaIds])

  const filtered = useMemo(() => {
    return sumary.filter(s => {
      if (filter.search.trim() && !s.full_name.toLowerCase().includes(filter.search.toLowerCase())) return false
      if (filter.status === 'kompletny' && (s.ma_anomalie || s.auto_doplnene_count > 0)) return false
      if (filter.status === 'neuplny' && !s.ma_anomalie) return false
      if (filter.status === 'anomalie' && !s.ma_anomalie) return false
      if (filter.status === 'auto_doplnene' && s.auto_doplnene_count === 0) return false
      if (filter.status === 'schvaleny' && !s.schvalene) return false
      if (filter.status === 'neschvaleny' && s.schvalene) return false
      return true
    })
  }, [sumary, filter])

  const autoDoplneneTotal = sumary.reduce((s, x) => s + x.auto_doplnene_count, 0)
  const anomaliTotal = sumary.filter(s => s.ma_anomalie).length
  const topNadcasy = [...sumary]
    .filter(s => s.nadcas_hod > 0)
    .sort((a, b) => b.nadcas_hod - a.nadcas_hod)
    .slice(0, 3)
    .map(s => ({ name: s.full_name.replace('[DEMO] ', ''), hours: s.nadcas_hod }))

  const firmaNazov = (id: string | null) => firmy.find(f => f.id === id)?.nazov || '—'

  const columns: Column<MesacnySumar>[] = [
    {
      key: '_select',
      label: '',
      headerClassName: 'w-10',
      className: 'w-10',
      headerRender: () => {
        const allSelected = filtered.length > 0 && filtered.every(s => selected.has(s.user_id))
        return (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {
              e.stopPropagation()
              if (allSelected) setSelected(new Set())
              else setSelected(new Set(filtered.map(s => s.user_id)))
            }}
          />
        )
      },
      render: (s) => (
        <input
          type="checkbox"
          checked={selected.has(s.user_id)}
          onClick={e => e.stopPropagation()}
          onChange={(e) => {
            const next = new Set(selected)
            if (e.target.checked) next.add(s.user_id)
            else next.delete(s.user_id)
            setSelected(next)
          }}
        />
      ),
    },
    { key: 'full_name', label: 'Meno', sortable: true, render: s => <span className="font-medium">{s.full_name}</span> },
    { key: 'firma', label: 'Firma', render: s => <span className="text-xs text-gray-500">{firmaNazov(s.firma_id)}</span> },
    { key: 'pozicia', label: 'Pozícia', render: s => <span className="text-xs text-gray-500">{s.pozicia || '—'}</span> },
    { key: 'fond_min', label: 'Fond', sortable: true, className: 'text-right',
      render: s => <span>{Math.round(s.fond_min / 60)}h</span> },
    { key: 'odpracovane_min', label: 'Odprac.', sortable: true, className: 'text-right',
      render: s => <span className="font-mono">{Math.floor(s.odpracovane_min / 60)}h {String(s.odpracovane_min % 60).padStart(2, '0')}m</span> },
    { key: 'rozdiel_min', label: '±', sortable: true, className: 'text-right',
      render: s => (
        <span className={`font-mono font-semibold ${s.rozdiel_min < 0 ? 'text-red-600' : s.rozdiel_min > 0 ? 'text-green-700' : 'text-gray-500'}`}>
          {formatMinutyNaHodiny(s.rozdiel_min)}
        </span>
      ) },
    { key: 'dovolenka_dni', label: 'Dov.', className: 'text-right', render: s => <span className="text-blue-600">{s.dovolenka_dni}</span> },
    { key: 'pn_dni', label: 'PN', className: 'text-right', render: s => <span className="text-orange-600">{s.pn_dni}</span> },
    { key: 'ocr_dni', label: 'OČR', className: 'text-right', render: s => <span className="text-purple-600">{s.ocr_dni}</span> },
    { key: 'nadcas_hod', label: 'Nadč.', sortable: true, className: 'text-right', render: s => <span className="text-red-600 font-mono">{s.nadcas_hod.toFixed(1)}h</span> },
    { key: 'auto_doplnene_count', label: 'Auto', className: 'text-right',
      render: s => s.auto_doplnene_count > 0
        ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-bold">🤖 {s.auto_doplnene_count}</span>
        : <span className="text-gray-300">—</span> },
    { key: 'status', label: 'Status',
      render: s => s.ma_anomalie
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs"><AlertTriangle size={12}/>Anomálie</span>
        : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs"><Check size={12}/>OK</span> },
    { key: 'schvalene', label: '✓',
      render: s => s.schvalene
        ? <span className="text-green-600" title="Schválené hodiny">✓</span>
        : <span className="text-gray-300">○</span> },
    { key: '_actions', label: '',
      render: s => <ChevronRight size={16} className="text-gray-400" /> },
  ]

  async function handleBulkSchvalitVybranych() {
    if (selected.size === 0) return
    if (!confirm(`Schváliť hodiny pre ${selected.size} zamestnancov?`)) return
    for (const userId of selected) {
      await schvalitHodinyZamestnanca(userId, filter.mesiac)
    }
    setSelected(new Set())
    router.refresh()
  }

  async function handleBulkSchvalitFirmu(firmaId: string) {
    if (!confirm(`Schváliť hodiny pre celú firmu?`)) return
    const result = await bulkSchvalitFirmu(firmaId, filter.mesiac)
    if (result && 'error' in result && result.error) alert(result.error)
    else if (result && 'count' in result) alert(`Schválené ${result.count} zamestnancov.`)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Dochádzka — prehľad</h2>
        <Link href="/admin/dochadzka/uzavierka" className="text-sm text-primary hover:underline flex items-center gap-1">
          Mesačná uzávierka <ChevronRight size={14} />
        </Link>
      </div>

      <MzdarkaTodoPanel mesiac={filter.mesiac} />

      <DochadzkaFiltre
        values={filter}
        onChange={setFilter}
        firmy={firmy}
      />

      <DochadzkaKPI
        vPraciCount={vPraci.length}
        autoDoplneneCount={autoDoplneneTotal}
        anomaliCount={anomaliTotal}
        topNadcasy={topNadcasy}
        onFilter={(status) => setFilter({ ...filter, status })}
      />

      {/* Stav uzávierky per firma — banner */}
      {filter.firmaIds.length === 1 && (() => {
        const fid = filter.firmaIds[0]
        const u = uzavierky.find(x => x.firma_id === fid && x.mesiac === filter.mesiac)
        const stav = u?.stav || 'otvoreny'
        return (
          <div className={`mb-4 p-3 rounded-xl border flex items-center justify-between ${
            stav === 'uzavrety' ? 'bg-gray-50 border-gray-300' :
            stav === 'na_kontrolu' ? 'bg-yellow-50 border-yellow-300' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {stav === 'uzavrety' ? <Lock size={16} /> : <Unlock size={16} />}
              <span className="text-sm font-semibold">{firmaNazov(fid)} — {filter.mesiac}: <span className="uppercase">{stav.replace('_', ' ')}</span></span>
            </div>
            <div className="flex gap-2">
              {stav === 'otvoreny' && <button onClick={() => spustitKontrolu(fid, filter.mesiac).then(() => router.refresh())} className="px-3 py-1.5 bg-yellow-600 text-white rounded text-xs">Spustiť kontrolu</button>}
              {stav === 'na_kontrolu' && <>
                <button onClick={() => handleBulkSchvalitFirmu(fid)} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs">Schváliť celú firmu</button>
                <button onClick={() => uzavrietMesiac(fid, filter.mesiac).then(() => router.refresh())} className="px-3 py-1.5 bg-gray-800 text-white rounded text-xs">Uzavrieť mesiac</button>
              </>}
            </div>
          </div>
        )
      })()}

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 p-2 bg-primary/5 border border-primary/30 rounded-lg text-sm">
          <span>Vybraných: <strong>{selected.size}</strong></span>
          <button onClick={handleBulkSchvalitVybranych} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Schváliť vybraných</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-500 hover:text-gray-700">Zrušiť výber</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Načítavam…</div>
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={s => s.user_id}
          onRowClick={s => router.push(`/admin/dochadzka/${s.user_id}?mesiac=${filter.mesiac}`)}
          searchable={false}
          pageSize={50}
          exportFilename={`dochadzka-${filter.mesiac}`}
          emptyMessage="Žiadny zamestnanec nezodpovedá filtru."
        />
      )}
    </div>
  )
}
