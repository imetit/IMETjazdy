'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import { TYP_SERVISU_LABELS, STAV_SERVISU_LABELS } from '@/lib/fleet-types'
import type { Vozidlo } from '@/lib/types'

interface Props {
  vozidla: Vozidlo[]
  defaultVozidloId?: string
  onSubmit: (formData: FormData) => Promise<{ error?: string } | undefined>
  onClose: () => void
}

export default function ServisForm({ vozidla, defaultVozidloId, onSubmit, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await onSubmit(new FormData(e.currentTarget))
    if (result?.error) { setError(result.error); setLoading(false) }
    else onClose()
  }

  return (
    <Modal onClose={onClose} title="Nový servisný záznam">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vozidlo *</label>
            <select name="vozidlo_id" defaultValue={defaultVozidloId} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Vyber vozidlo —</option>
              {vozidla.map(v => <option key={v.id} value={v.id}>{v.spz} — {v.znacka} {v.variant}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ *</label>
            <select name="typ" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {Object.entries(TYP_SERVISU_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dátum *</label>
            <input name="datum" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
            <select name="stav" defaultValue="planovane" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {Object.entries(STAV_SERVISU_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cena (€)</label>
            <input name="cena" type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dodávateľ</label>
            <input name="dodavatel" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Km pri servise</label>
            <input name="km_pri_servise" type="number" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Popis *</label>
          <textarea name="popis" required rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prílohy (faktúry, fotky)</label>
          <input name="files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="text-sm" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Zrušiť</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {loading ? 'Ukladám...' : 'Vytvoriť'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
