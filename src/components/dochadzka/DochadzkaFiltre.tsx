'use client'
import { useRef, useEffect } from 'react'
import { Search } from 'lucide-react'

export interface FilterValues {
  mesiac: string
  firmaIds: string[]
  status: 'all' | 'kompletny' | 'neuplny' | 'anomalie' | 'auto_doplnene' | 'schvaleny' | 'neschvaleny'
  search: string
}

interface Props {
  values: FilterValues
  onChange: (v: FilterValues) => void
  firmy: Array<{ id: string; nazov: string; kod: string }>
}

export default function DochadzkaFiltre({ values, onChange, firmy }: Props) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  // Zatvor dropdown pri klike mimo
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap gap-3 items-center">
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Mesiac</label>
        <input
          type="month"
          value={values.mesiac}
          onChange={e => onChange({ ...values, mesiac: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Firma</label>
        <details ref={detailsRef} className="relative">
          <summary className="border rounded-lg px-3 py-2 text-sm cursor-pointer min-w-[180px] list-none flex items-center justify-between gap-2">
            <span>{values.firmaIds.length === 0 ? 'Všetky firmy' : `${values.firmaIds.length} ${values.firmaIds.length === 1 ? 'firma' : 'firmy'}`}</span>
            <span className="text-gray-400">▾</span>
          </summary>
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg p-2 shadow-lg max-h-72 overflow-y-auto z-30 min-w-[260px]">
            <div className="flex justify-between mb-2 pb-2 border-b">
              <button onClick={() => onChange({ ...values, firmaIds: firmy.map(f => f.id) })} className="text-xs text-primary hover:underline">Označiť všetky</button>
              <button onClick={() => onChange({ ...values, firmaIds: [] })} className="text-xs text-gray-500 hover:underline">Zrušiť</button>
            </div>
            {firmy.map(f => (
              <label key={f.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-gray-50 px-2 rounded">
                <input
                  type="checkbox"
                  checked={values.firmaIds.includes(f.id)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...values.firmaIds, f.id]
                      : values.firmaIds.filter(x => x !== f.id)
                    onChange({ ...values, firmaIds: next })
                  }}
                />
                <span className="font-mono text-xs text-gray-500">{f.kod}</span>
                <span>{f.nazov}</span>
              </label>
            ))}
          </div>
        </details>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Status</label>
        <select
          value={values.status}
          onChange={e => onChange({ ...values, status: e.target.value as FilterValues['status'] })}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Všetky</option>
          <option value="kompletny">Kompletní</option>
          <option value="neuplny">Neúplní</option>
          <option value="anomalie">S anomáliami</option>
          <option value="auto_doplnene">Auto-doplnené</option>
          <option value="schvaleny">Schválení</option>
          <option value="neschvaleny">Neschválení</option>
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Hľadať</label>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={values.search}
            onChange={e => onChange({ ...values, search: e.target.value })}
            placeholder="Meno zamestnanca…"
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  )
}
