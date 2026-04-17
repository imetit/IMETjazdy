// src/components/archiv/KategorieSidebar.tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { ArchivKategoria } from '@/lib/archiv-types'
import { createKategoria } from '@/actions/archiv-kategorie'
import { useRouter } from 'next/navigation'

interface Props {
  kategorie: ArchivKategoria[]
  selected: string | null
  onSelect: (id: string | null) => void
  counts: Record<string, number>
}

export default function KategorieSidebar({ kategorie, selected, onSelect, counts }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const parents = kategorie.filter(k => !k.parent_id)
  const children = (parentId: string) => kategorie.filter(k => k.parent_id === parentId)

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  async function handleCreate() {
    if (!newName.trim()) return
    setLoading(true)
    await createKategoria(newName.trim())
    setNewName('')
    setShowForm(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Kategórie</h3>

      <div className="space-y-1">
        {/* All documents */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
            selected === null ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>Všetky</span>
          <span className="text-xs text-gray-400">{totalCount}</span>
        </button>

        {/* Category tree */}
        {parents.map(parent => (
          <div key={parent.id}>
            <button
              onClick={() => onSelect(parent.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
                selected === parent.id ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                {parent.farba && (
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: parent.farba }} />
                )}
                {parent.nazov}
              </span>
              <span className="text-xs text-gray-400">{counts[parent.id] || 0}</span>
            </button>

            {/* Children */}
            {children(parent.id).map(child => (
              <button
                key={child.id}
                onClick={() => onSelect(child.id)}
                className={`w-full text-left pl-8 pr-3 py-1.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                  selected === child.id ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  {child.farba && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: child.farba }} />
                  )}
                  {child.nazov}
                </span>
                <span className="text-xs text-gray-400">{counts[child.id] || 0}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Add category */}
      {showForm ? (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Názov kategórie"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={loading || !newName.trim()}
              className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50"
            >
              {loading ? 'Ukladám...' : 'Pridať'}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName('') }}
              className="px-3 py-1 text-gray-500 text-xs"
            >
              Zrušiť
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
        >
          <Plus size={14} /> Pridať kategóriu
        </button>
      )}
    </div>
  )
}
