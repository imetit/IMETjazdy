'use client'

import { useState } from 'react'
import { createPoistnaUdalost } from '@/actions/fleet-poistne'
import { useRouter } from 'next/navigation'
import type { Vozidlo } from '@/lib/types'

interface Props {
  vozidlo: Vozidlo
  userName: string
}

export default function PoistnaUdalostForm({ vozidlo, userName }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [policajnaSprava, setPolicajnaSprava] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    formData.set('vozidlo_id', vozidlo.id)
    formData.set('policajna_sprava', policajnaSprava ? 'true' : 'false')
    const result = await createPoistnaUdalost(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      e.currentTarget.reset()
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4">
      <h3 className="text-lg font-semibold">Nahlásiť poistnú udalosť</h3>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">Poistná udalosť bola nahlásená.</p>}

      {/* Pre-filled vehicle info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Vozidlo:</span><span className="font-medium">{vozidlo.znacka} {vozidlo.variant}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">ŠPZ:</span><span className="font-medium font-mono">{vozidlo.spz}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">VIN:</span><span className="font-medium font-mono">{vozidlo.vin || '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Nahlasuje:</span><span className="font-medium">{userName}</span></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dátum udalosti *</label>
          <input name="datum" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Čas</label>
          <input name="cas" type="time" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Miesto udalosti *</label>
        <input name="miesto" required placeholder="Napr. Bratislava, Bajkalská ul., križovatka..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Popis udalosti *</label>
        <textarea name="popis" required rows={4} placeholder="Detailne popíšte čo sa stalo..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Popis škody</label>
        <textarea name="skoda_popis" rows={2} placeholder="Aké poškodenia vznikli..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Svedkovia</label>
        <input name="svedkovia" placeholder="Mená a kontakty svedkov (ak boli)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={policajnaSprava} onChange={e => setPolicajnaSprava(e.target.checked)} className="rounded border-gray-300" />
        <span className="text-sm font-medium text-gray-700">Bola privolaná polícia</span>
      </label>

      <button type="submit" disabled={loading} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
        {loading ? 'Odosielam...' : 'Nahlásiť poistnú udalosť'}
      </button>
    </form>
  )
}
