'use client'

import { useState } from 'react'
import { Plus, Trash2, MapPin } from 'lucide-react'
import { formatDate, getKontrolaStatus, getStatusColor, getStatusLabel } from '@/lib/fleet-utils'
import { createZnamka, deleteZnamka } from '@/actions/fleet-znamky'
import { useRouter } from 'next/navigation'

interface Znamka {
  id: string
  vozidlo_id: string
  krajina: string
  platnost_od: string
  platnost_do: string
  cislo: string | null
  created_at: string
}

interface Props {
  vozidloId: string
  znamky: Znamka[]
  readonly?: boolean
}

const KRAJINY = ['Slovensko', 'Česko', 'Rakústvo', 'Maďarsko', 'Poľsko', 'Slovinsko', 'Chorvátsko', 'Nemecko', 'Švajčiarsko', 'Taliansko', 'Francúzsko']

export default function ZnamkySection({ vozidloId, znamky, readonly }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('vozidlo_id', vozidloId)
    await createZnamka(formData)
    setShowForm(false)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await deleteZnamka(id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {!readonly && (
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium">
          <Plus size={16} /> Pridať diaľničnú známku
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Krajina *</label>
              <select name="krajina" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {KRAJINY.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Číslo známky</label>
              <input name="cislo" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Platnosť od *</label>
              <input name="platnost_od" type="date" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Platnosť do *</label>
              <input name="platnost_do" type="date" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {loading ? 'Ukladám...' : 'Pridať'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Zrušiť</button>
          </div>
        </form>
      )}

      {znamky.length === 0 ? (
        <p className="text-gray-500 text-sm">Žiadne diaľničné známky</p>
      ) : (
        <div className="space-y-2">
          {znamky.map(z => {
            const status = getKontrolaStatus(z.platnost_do)
            const color = getStatusColor(status)
            const label = getStatusLabel(status)
            return (
              <div key={z.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{z.krajina}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(z.platnost_od)} — {formatDate(z.platnost_do)}
                      {z.cislo && <> · č. {z.cislo}</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>
                  {!readonly && (
                    <button onClick={() => handleDelete(z.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
