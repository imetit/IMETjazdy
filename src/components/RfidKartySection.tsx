'use client'

import { useState } from 'react'
import { Plus, Trash2, CreditCard } from 'lucide-react'
import { createRfidKarta, toggleRfidKarta, deleteRfidKarta } from '@/actions/rfid-karty'
import { useRouter } from 'next/navigation'

interface RfidKarta {
  id: string
  kod_karty: string
  aktivna: boolean
  created_at: string
}

interface Props {
  userId: string
  karty: RfidKarta[]
}

export default function RfidKartySection({ userId, karty }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [kodKarty, setKodKarty] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleAdd() {
    if (!kodKarty.trim()) return
    setLoading(true)
    setError('')
    const result = await createRfidKarta(userId, kodKarty.trim())
    if (result?.error) setError(result.error)
    else { setShowAdd(false); setKodKarty('') }
    setLoading(false)
    router.refresh()
  }

  async function handleToggle(id: string, aktivna: boolean) {
    await toggleRfidKarta(id, aktivna, userId)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj zmazať kartu?')) return
    await deleteRfidKarta(id, userId)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">RFID karty</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium">
          <Plus size={16} /> Pridať kartu
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {showAdd && (
        <div className="flex gap-2 mb-4">
          <input
            value={kodKarty}
            onChange={e => setKodKarty(e.target.value)}
            placeholder="Kód karty (naskenujte alebo zadajte)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button onClick={handleAdd} disabled={loading || !kodKarty.trim()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
            {loading ? '...' : 'Pridať'}
          </button>
        </div>
      )}

      {karty.length === 0 ? (
        <p className="text-gray-500 text-sm">Žiadne RFID karty</p>
      ) : (
        <div className="space-y-2">
          {karty.map(k => (
            <div key={k.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <CreditCard size={16} className={k.aktivna ? 'text-green-500' : 'text-gray-400'} />
                <span className="font-mono text-sm">{k.kod_karty}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${k.aktivna ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {k.aktivna ? 'Aktívna' : 'Neaktívna'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleToggle(k.id, !k.aktivna)} className="text-xs text-gray-500 hover:text-primary">
                  {k.aktivna ? 'Deaktivovať' : 'Aktivovať'}
                </button>
                <button onClick={() => handleDelete(k.id)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
