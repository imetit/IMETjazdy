'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import { upsertDovolenkaNarok } from '@/actions/dovolenky-naroky'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  narok: { narok_dni: number; prenesene_dni: number } | null
}

export default function DovolenkaNarokSection({ userId, narok }: Props) {
  const rok = new Date().getFullYear()
  const [narokDni, setNarokDni] = useState(narok?.narok_dni ?? 20)
  const [preneseneDni, setPreneseneDni] = useState(narok?.prenesene_dni ?? 0)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  async function handleSave() {
    setLoading(true)
    setSaved(false)
    await upsertDovolenkaNarok(userId, rok, narokDni, preneseneDni)
    setSaved(true)
    setLoading(false)
    router.refresh()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Nárok na dovolenku ({rok})</h3>
      <div className="flex items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nárok (dni)</label>
          <input type="number" min="0" value={narokDni} onChange={e => setNarokDni(parseInt(e.target.value) || 0)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prenesené (dni)</label>
          <input type="number" min="0" value={preneseneDni} onChange={e => setPreneseneDni(parseInt(e.target.value) || 0)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Celkom</label>
          <p className="px-3 py-2 text-sm font-bold">{narokDni + preneseneDni} dní</p>
        </div>
        <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
          <Save size={16} /> {loading ? 'Ukladám...' : saved ? 'Uložené ✓' : 'Uložiť'}
        </button>
      </div>
    </div>
  )
}
