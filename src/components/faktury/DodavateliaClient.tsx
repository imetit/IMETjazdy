'use client'

import { useState, useTransition } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Plus, Search, Edit, Power } from 'lucide-react'
import type { Dodavatel } from '@/lib/faktury-types'
import { VSETKY_MENY } from '@/lib/faktury-types'
import { createDodavatel, updateDodavatel } from '@/actions/dodavatelia'

export default function DodavateliaClient({ initialData }: { initialData: Dodavatel[] }) {
  const [search, setSearch] = useState('')
  const { data } = useSWR<{ data: Dodavatel[] }>(`/api/admin/dodavatelia?search=${encodeURIComponent(search)}`, { fallbackData: { data: initialData } })
  const dodavatelia = data?.data || initialData
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Dodávatelia</h2>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 bg-primary text-white px-3 py-2 rounded text-sm">
          <Plus size={14} /> Pridať
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded text-sm" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Názov</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">IČO</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">DIČ</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">IBAN</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600">Mena</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600">DPH %</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600">Aktívny</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dodavatelia.map(d => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{d.nazov}</td>
                <td className="px-3 py-2">{d.ico || '—'}</td>
                <td className="px-3 py-2">{d.dic || '—'}</td>
                <td className="px-3 py-2 text-xs">{d.iban || '—'}</td>
                <td className="px-3 py-2 text-center">{d.default_mena}</td>
                <td className="px-3 py-2 text-center">{d.default_dph_sadzba}</td>
                <td className="px-3 py-2 text-center">{d.aktivny ? '✓' : '×'}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditingId(d.id)} className="text-gray-400 hover:text-gray-700 mr-2"><Edit size={14} /></button>
                  <button onClick={() => startTransition(async () => {
                    await updateDodavatel(d.id, { aktivny: !d.aktivny })
                    globalMutate(`/api/admin/dodavatelia?search=${encodeURIComponent(search)}`)
                  })} className="text-gray-400 hover:text-gray-700"><Power size={14} /></button>
                </td>
              </tr>
            ))}
            {dodavatelia.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-6">Žiadne</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && <DodavatelModal onClose={() => setShowAdd(false)} onSaved={() => { globalMutate(`/api/admin/dodavatelia?search=${encodeURIComponent(search)}`); setShowAdd(false) }} />}
    </div>
  )
}

function DodavatelModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-bold mb-3">Nový dodávateľ</h3>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <form onSubmit={e => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          startTransition(async () => {
            const r = await createDodavatel(fd)
            if ('error' in r && r.error) setError(r.error)
            else onSaved()
          })
        }} className="grid grid-cols-2 gap-3">
          <input name="nazov" placeholder="Názov *" required className="col-span-2 border rounded p-2 text-sm" />
          <input name="ico" placeholder="IČO" className="border rounded p-2 text-sm" />
          <input name="dic" placeholder="DIČ" className="border rounded p-2 text-sm" />
          <input name="ic_dph" placeholder="IČ DPH" className="border rounded p-2 text-sm" />
          <input name="iban" placeholder="IBAN" className="border rounded p-2 text-sm" />
          <select name="default_mena" defaultValue="EUR" className="border rounded p-2 text-sm">
            {VSETKY_MENY.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input name="default_dph_sadzba" type="number" defaultValue="20" placeholder="DPH %" className="border rounded p-2 text-sm" />
          <input name="email" placeholder="Email" className="col-span-2 border rounded p-2 text-sm" />
          <input name="adresa" placeholder="Adresa" className="col-span-2 border rounded p-2 text-sm" />
          <div className="col-span-2 flex gap-2 justify-end mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm">Zrušiť</button>
            <button type="submit" disabled={pending} className="bg-primary text-white px-4 py-2 rounded text-sm">Vytvoriť</button>
          </div>
        </form>
      </div>
    </div>
  )
}
