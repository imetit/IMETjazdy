'use client'

import { useState } from 'react'
import { Plus, Trash2, GraduationCap, ExternalLink } from 'lucide-react'
import { TYP_SKOLENIA_LABELS } from '@/lib/skolenia-types'
import { createSkolenie, deleteSkolenie } from '@/actions/skolenia'
import { useRouter } from 'next/navigation'

interface Skolenie {
  id: string
  typ: string
  nazov: string
  datum_absolvovany: string | null
  platnost_do: string | null
  stav: string
  certifikat_url: string | null
  poznamka: string | null
}

interface Props {
  profileId: string
  skolenia: Skolenie[]
  readonly?: boolean
}

const STAV_STYLES: Record<string, string> = {
  platne: 'bg-green-100 text-green-800',
  blizi_sa: 'bg-orange-100 text-orange-800',
  expirovane: 'bg-red-100 text-red-800',
}

const STAV_LABELS: Record<string, string> = {
  platne: 'Platné',
  blizi_sa: 'Blíži sa',
  expirovane: 'Expirované',
}

export default function SkoleniaSection({ profileId, skolenia, readonly = false }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.set('profile_id', profileId)

    const result = await createSkolenie(formData)
    if (result?.error) setError(result.error)
    else setShowForm(false)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj zmazať školenie?')) return
    setLoading(true)
    await deleteSkolenie(id, profileId)
    setLoading(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap size={20} className="text-gray-400" />
          <h3 className="text-lg font-semibold">Školenia a certifikáty</h3>
        </div>
        {!readonly && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium"
          >
            <Plus size={16} /> Pridať školenie
          </button>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {showForm && !readonly && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Typ</label>
              <select name="typ" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {Object.entries(TYP_SKOLENIA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Názov</label>
              <input name="nazov" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Dátum absolvovaný</label>
              <input name="datum_absolvovany" type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Platnosť do</label>
              <input name="platnost_do" type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Certifikát (súbor)</label>
              <input name="certifikat" type="file" accept=".pdf,.jpg,.jpeg,.png" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Poznámka</label>
              <input name="poznamka" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {loading ? 'Ukladám...' : 'Uložiť'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">
              Zrušiť
            </button>
          </div>
        </form>
      )}

      {skolenia.length === 0 ? (
        <p className="text-gray-500 text-sm">Žiadne školenia</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Typ</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Názov</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Absolvovaný</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Platnosť do</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Stav</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Certifikát</th>
                {!readonly && <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Akcie</th>}
              </tr>
            </thead>
            <tbody>
              {skolenia.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3">{TYP_SKOLENIA_LABELS[s.typ] || s.typ}</td>
                  <td className="py-2 px-3 font-medium">{s.nazov}</td>
                  <td className="py-2 px-3 text-gray-500">
                    {s.datum_absolvovany ? new Date(s.datum_absolvovany).toLocaleDateString('sk-SK') : '-'}
                  </td>
                  <td className="py-2 px-3 text-gray-500">
                    {s.platnost_do ? new Date(s.platnost_do).toLocaleDateString('sk-SK') : '-'}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAV_STYLES[s.stav] || 'bg-gray-100 text-gray-600'}`}>
                      {STAV_LABELS[s.stav] || s.stav}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {s.certifikat_url ? (
                      <a href={s.certifikat_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        <ExternalLink size={12} /> Zobraziť
                      </a>
                    ) : '-'}
                  </td>
                  {!readonly && (
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => handleDelete(s.id)} disabled={loading} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
