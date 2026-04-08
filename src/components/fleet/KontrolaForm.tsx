'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import { TYP_KONTROLY_LABELS } from '@/lib/fleet-types'
import type { Vozidlo } from '@/lib/types'

interface Props {
  vozidla: Vozidlo[]
  onSubmit: (formData: FormData) => Promise<{ error?: string } | undefined>
  onClose: () => void
}

export default function KontrolaForm({ vozidla, onSubmit, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [zaplatene, setZaplatene] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('zaplatene', zaplatene ? 'true' : 'false')
    const result = await onSubmit(formData)
    if (result?.error) { setError(result.error); setLoading(false) }
    else onClose()
  }

  return (
    <Modal onClose={onClose} title="Nová kontrola / poistenie">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vozidlo *</label>
            <select name="vozidlo_id" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Vyber vozidlo —</option>
              {vozidla.map(v => <option key={v.id} value={v.id}>{v.spz} — {v.znacka} {v.variant}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ *</label>
            <select name="typ" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {Object.entries(TYP_KONTROLY_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dátum vykonania *</label>
            <input name="datum_vykonania" type="date" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platnosť do *</label>
            <input name="platnost_do" type="date" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cena (€)</label>
            <input name="cena" type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={zaplatene} onChange={e => setZaplatene(e.target.checked)} className="rounded border-gray-300 text-primary" />
              <span className="text-sm font-medium text-gray-700">Zaplatené</span>
            </label>
            {zaplatene && (
              <input name="datum_platby" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
          <textarea name="poznamka" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
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
