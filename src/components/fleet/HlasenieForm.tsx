'use client'

import { useState } from 'react'
import { PRIORITA_LABELS } from '@/lib/fleet-types'
import type { Vozidlo } from '@/lib/types'
import { createHlasenie } from '@/actions/fleet-hlasenia'
import { useRouter } from 'next/navigation'

interface Props {
  vozidla: Vozidlo[]
  defaultVozidloId?: string
}

export default function HlasenieForm({ vozidla, defaultVozidloId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    const result = await createHlasenie(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      e.currentTarget.reset()
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">Hlásenie odoslané!</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vozidlo *</label>
        <select name="vozidlo_id" defaultValue={defaultVozidloId} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">— Vyber vozidlo —</option>
          {vozidla.map(v => <option key={v.id} value={v.id}>{v.spz} — {v.znacka} {v.variant}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Popis problému *</label>
        <textarea name="popis" required rows={4} placeholder="Popíšte problém s vozidlom..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Priorita</label>
        <select name="priorita" defaultValue="normalna" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {Object.entries(PRIORITA_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
        {loading ? 'Odosielam...' : 'Odoslať hlásenie'}
      </button>
    </form>
  )
}
