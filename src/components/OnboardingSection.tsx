'use client'

import { useState } from 'react'
import { CheckCircle, Circle, Plus, Play } from 'lucide-react'
import { createDefaultOnboarding, toggleOnboardingItem, addCustomOnboardingItem } from '@/actions/onboarding'
import { useRouter } from 'next/navigation'

interface OnboardingItem {
  id: string
  typ: string
  nazov: string
  splnene: boolean
  splnene_datum: string | null
  splnil: { full_name: string } | null
  created_at: string
}

interface Props {
  profileId: string
  items: OnboardingItem[]
  isOffboarding?: boolean
}

export default function OnboardingSection({ profileId, items, isOffboarding = false }: Props) {
  const [loading, setLoading] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const completed = items.filter(i => i.splnene).length
  const total = items.length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const label = isOffboarding ? 'Offboarding' : 'Onboarding'

  async function handleStartOnboarding() {
    setLoading(true)
    setError('')
    const result = await createDefaultOnboarding(profileId)
    if (result?.error) setError(result.error)
    setLoading(false)
    router.refresh()
  }

  async function handleToggle(itemId: string, splnene: boolean) {
    setLoading(true)
    const result = await toggleOnboardingItem(itemId, splnene)
    if (result?.error) setError(result.error)
    setLoading(false)
    router.refresh()
  }

  async function handleAddItem() {
    if (!newItem.trim()) return
    setLoading(true)
    setError('')
    const result = await addCustomOnboardingItem(profileId, newItem.trim())
    if (result?.error) setError(result.error)
    else { setNewItem(''); setShowAdd(false) }
    setLoading(false)
    router.refresh()
  }

  if (items.length === 0 && !isOffboarding) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">{label}</h3>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm mb-4">Žiadne onboarding položky</p>
          <button
            onClick={handleStartOnboarding}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            <Play size={16} />
            {loading ? 'Spúšťam...' : 'Spustiť onboarding'}
          </button>
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{label}</h3>
        <span className="text-sm text-gray-500">{completed} z {total} ({percentage}%)</span>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all ${percentage === 100 ? 'bg-green-500' : 'bg-primary'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-2 mb-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggle(item.id, !item.splnene)}
                disabled={loading}
                className="flex-shrink-0"
              >
                {item.splnene ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <Circle size={20} className="text-gray-300 hover:text-primary" />
                )}
              </button>
              <div>
                <span className={`text-sm ${item.splnene ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  <span className="font-medium">{item.typ !== 'custom' && !item.typ.startsWith('offboarding_') ? `[${item.typ.toUpperCase()}] ` : ''}</span>
                  {item.nazov}
                </span>
                {item.splnene && item.splnene_datum && (
                  <p className="text-xs text-gray-400">
                    {new Date(item.splnene_datum).toLocaleDateString('sk-SK')}
                    {item.splnil?.full_name && ` — ${item.splnil.full_name}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add custom item */}
      <div>
        {showAdd ? (
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              placeholder="Názov novej položky"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
            />
            <button
              onClick={handleAddItem}
              disabled={loading || !newItem.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              Pridať
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewItem('') }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              Zrušiť
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium"
          >
            <Plus size={16} /> Pridať položku
          </button>
        )}
      </div>
    </div>
  )
}
