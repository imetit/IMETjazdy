'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X } from 'lucide-react'
import { addVodicToVozidlo, removeVodicFromVozidlo } from '@/actions/vozidlo-vodici'
import type { VozidloVodic } from '@/actions/vozidlo-vodici'

interface Props {
  vozidloId: string
  vodiciData: VozidloVodic[]
  vodici: { id: string; full_name: string; email: string }[]
}

export default function VodiciSection({ vozidloId, vodiciData, vodici }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [primarny, setPrimarny] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  // Filter out already assigned drivers
  const assignedIds = new Set(vodiciData.map(v => v.user_id))
  const availableVodici = vodici.filter(v => !assignedIds.has(v.id))

  async function handleAdd() {
    if (!selectedUserId) return
    setLoading(true)
    setError('')
    const result = await addVodicToVozidlo(vozidloId, selectedUserId, primarny)
    if (result?.error) {
      setError(result.error)
    } else {
      setShowAdd(false)
      setSelectedUserId('')
      setPrimarny(false)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleRemove(userId: string) {
    setLoading(true)
    setError('')
    const result = await removeVodicFromVozidlo(vozidloId, userId)
    if (result?.error) {
      setError(result.error)
    } else {
      setConfirmRemove(null)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Priradení vodiči</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <UserPlus size={16} /> Pridať vodiča
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {showAdd && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vodič</label>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Vyberte vodiča —</option>
              {availableVodici.map(v => (
                <option key={v.id} value={v.id}>{v.full_name} ({v.email})</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={primarny} onChange={e => setPrimarny(e.target.checked)} />
            Primárny vodič
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!selectedUserId || loading}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Ukladám...' : 'Pridať'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setSelectedUserId(''); setPrimarny(false) }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Zrušiť
            </button>
          </div>
        </div>
      )}

      {vodiciData.length === 0 ? (
        <p className="text-gray-500 text-sm">Žiadni priradení vodiči</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">Meno</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Priradený od</th>
              <th className="pb-2 font-medium">Rola</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {vodiciData.map(v => (
              <tr key={v.id} className="border-b border-gray-100">
                <td className="py-2 font-medium">{v.profile?.full_name || '—'}</td>
                <td className="py-2 text-gray-600">{v.profile?.email || '—'}</td>
                <td className="py-2">{new Date(v.od).toLocaleDateString('sk-SK')}</td>
                <td className="py-2">
                  {v.primarny && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                      Primárny
                    </span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {confirmRemove === v.user_id ? (
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-xs text-gray-500">Naozaj odstrániť?</span>
                      <button
                        onClick={() => handleRemove(v.user_id)}
                        disabled={loading}
                        className="text-red-600 text-xs font-medium hover:underline"
                      >
                        Áno
                      </button>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="text-gray-500 text-xs hover:underline"
                      >
                        Nie
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(v.user_id)}
                      className="text-red-500 hover:text-red-700"
                      title="Odstrániť vodiča"
                    >
                      <X size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
