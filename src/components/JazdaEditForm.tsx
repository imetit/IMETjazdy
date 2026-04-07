'use client'

import { useState } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import { updateJazdaAdmin } from '@/actions/jazdy'
import type { Jazda } from '@/lib/types'

export default function JazdaEditForm({ jazda }: { jazda: Jazda }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    mesiac: jazda.mesiac,
    odchod_z: jazda.odchod_z,
    prichod_do: jazda.prichod_do,
    cez: jazda.cez || '',
    km: jazda.km,
    cas_odchodu: jazda.cas_odchodu,
    cas_prichodu: jazda.cas_prichodu,
  })

  async function handleSave() {
    setLoading(true)
    const result = await updateJazdaAdmin(jazda.id, {
      ...form,
      km: Number(form.km),
      cez: form.cez || undefined,
    })
    if (result?.error) alert(result.error)
    setLoading(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Údaje jazdy</h3>
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors">
            <Pencil size={14} /> Upraviť
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          <div><span className="text-gray-500">Mesiac:</span> <span>{jazda.mesiac}</span></div>
          <div><span className="text-gray-500">Odchod z:</span> <span>{jazda.odchod_z}</span></div>
          <div><span className="text-gray-500">Príchod do:</span> <span>{jazda.prichod_do}</span></div>
          <div><span className="text-gray-500">Cez:</span> <span>{jazda.cez || '-'}</span></div>
          <div><span className="text-gray-500">KM:</span> <span className="font-semibold">{jazda.km}</span></div>
          <div><span className="text-gray-500">Čas odchodu:</span> <span>{jazda.cas_odchodu}</span></div>
          <div><span className="text-gray-500">Čas príchodu:</span> <span>{jazda.cas_prichodu}</span></div>
        </div>
        {jazda.komentar && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <span className="font-medium">Komentár pri vrátení:</span> {jazda.komentar}
          </div>
        )}
      </div>
    )
  }

  const ic = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"

  return (
    <div className="bg-white rounded-card shadow-sm border border-primary/30 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Upraviť jazdu</h3>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mesiac</label>
          <input type="month" value={form.mesiac} onChange={(e) => setForm({ ...form, mesiac: e.target.value })} className={ic} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Odchod z</label>
          <input value={form.odchod_z} onChange={(e) => setForm({ ...form, odchod_z: e.target.value })} className={ic} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Príchod do</label>
          <input value={form.prichod_do} onChange={(e) => setForm({ ...form, prichod_do: e.target.value })} className={ic} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cez</label>
          <input value={form.cez} onChange={(e) => setForm({ ...form, cez: e.target.value })} className={ic} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">KM</label>
          <input type="number" step="0.1" value={form.km} onChange={(e) => setForm({ ...form, km: parseFloat(e.target.value) || 0 })} className={ic} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Čas odchodu</label>
          <input type="time" value={form.cas_odchodu} onChange={(e) => setForm({ ...form, cas_odchodu: e.target.value })} className={ic} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Čas príchodu</label>
          <input type="time" value={form.cas_prichodu} onChange={(e) => setForm({ ...form, cas_prichodu: e.target.value })} className={ic} />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          <Save size={14} /> {loading ? 'Ukladám...' : 'Uložiť zmeny'}
        </button>
        <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Zrušiť</button>
      </div>
    </div>
  )
}
