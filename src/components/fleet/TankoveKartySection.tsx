'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Trash2, Pencil, Plus, X } from 'lucide-react'
import { createTankovaKarta, updateTankovaKarta, deleteTankovaKarta } from '@/actions/fleet-tankove-karty'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import { TYP_KARTY_LABELS, STAV_KARTY_LABELS } from '@/lib/fleet-types'
import type { TankovaKarta } from '@/lib/fleet-types'
import Modal from '@/components/Modal'

interface Props {
  karty: TankovaKarta[]
  vozidloId?: string
  vodici?: { id: string; full_name: string }[]
  vozidla?: { id: string; spz: string; znacka: string }[]
}

export default function TankoveKartySection({ karty, vozidloId, vodici = [], vozidla = [] }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TankovaKarta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [priradenie, setPriradenie] = useState<'vozidlo' | 'vodic'>('vozidlo')
  const router = useRouter()

  const stavColor = (s: string) => {
    switch (s) {
      case 'aktivna': return 'bg-green-100 text-green-800'
      case 'blokovana': return 'bg-orange-100 text-orange-800'
      case 'zrusena': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    // Nastaviť priradenie podľa výberu
    if (priradenie === 'vozidlo') {
      formData.delete('vodic_id')
      if (vozidloId) formData.set('vozidlo_id', vozidloId)
    } else {
      formData.delete('vozidlo_id')
    }

    const result = await createTankovaKarta(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setShowForm(false)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const updateData: Record<string, any> = {
      cislo_karty: formData.get('cislo_karty') as string,
      typ: formData.get('typ') as string,
      stav: formData.get('stav') as string,
      limit_mesacny: formData.get('limit_mesacny') ? parseFloat(formData.get('limit_mesacny') as string) : null,
      platnost_do: (formData.get('platnost_do') as string) || null,
      poznamka: (formData.get('poznamka') as string) || null,
    }

    const priradenTyp = formData.get('priradenie_typ') as string
    if (priradenTyp === 'vozidlo') {
      updateData.vozidlo_id = (formData.get('vozidlo_id') as string) || null
      updateData.vodic_id = null
    } else {
      updateData.vodic_id = (formData.get('vodic_id') as string) || null
      updateData.vozidlo_id = null
    }

    const result = await updateTankovaKarta(editing.id, updateData)
    if (result?.error) {
      setError(result.error)
    } else {
      setEditing(null)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj chcete zmazať túto tankovú kartu?')) return
    const result = await deleteTankovaKarta(id)
    if (result?.error) setError(result.error)
    else router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Tlačidlo pridať */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus size={16} />
          Pridať kartu
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Formulár na pridanie */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Číslo karty *</label>
              <input
                type="text"
                name="cislo_karty"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ *</label>
              <select name="typ" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {Object.entries(TYP_KARTY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
              <select name="stav" defaultValue="aktivna" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {Object.entries(STAV_KARTY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priradenie */}
          {!vozidloId && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Priradenie</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={priradenie === 'vozidlo'}
                    onChange={() => setPriradenie('vozidlo')}
                  />
                  Vozidlu
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={priradenie === 'vodic'}
                    onChange={() => setPriradenie('vodic')}
                  />
                  Vodičovi
                </label>
              </div>
              {priradenie === 'vozidlo' ? (
                <select name="vozidlo_id" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">-- nevybrané --</option>
                  {vozidla.map(v => (
                    <option key={v.id} value={v.id}>{v.spz} - {v.znacka}</option>
                  ))}
                </select>
              ) : (
                <select name="vodic_id" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">-- nevybrané --</option>
                  {vodici.map(v => (
                    <option key={v.id} value={v.id}>{v.full_name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mesačný limit (€)</label>
              <input
                type="number"
                name="limit_mesacny"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platnosť do</label>
              <input
                type="date"
                name="platnost_do"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
            <input
              type="text"
              name="poznamka"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Ukladám...' : 'Uložiť'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300"
            >
              Zrušiť
            </button>
          </div>
        </form>
      )}

      {/* Tabuľka */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Číslo karty</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Typ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Priradené</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Stav</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Limit mesačný</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Platnosť do</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {karty.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Žiadne tankové karty
                </td>
              </tr>
            ) : (
              karty.map(k => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{k.cislo_karty}</td>
                  <td className="px-4 py-3">{TYP_KARTY_LABELS[k.typ] || k.typ}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {k.vozidlo ? (
                      <span>{k.vozidlo.spz}</span>
                    ) : k.vodic ? (
                      <span>{k.vodic.full_name}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${stavColor(k.stav)}`}>
                      {STAV_KARTY_LABELS[k.stav] || k.stav}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {k.limit_mesacny ? formatCurrency(k.limit_mesacny) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {k.platnost_do ? formatDate(k.platnost_do) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditing(k)
                          setPriradenie(k.vodic_id ? 'vodic' : 'vozidlo')
                        }}
                        className="text-blue-500 hover:text-blue-700"
                        title="Upraviť"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(k.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Zmazať"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <Modal title="Upraviť tankovú kartu" onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Číslo karty *</label>
              <input
                type="text"
                name="cislo_karty"
                required
                defaultValue={editing.cislo_karty}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ *</label>
              <select name="typ" required defaultValue={editing.typ} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {Object.entries(TYP_KARTY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
              <select name="stav" defaultValue={editing.stav} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {Object.entries(STAV_KARTY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Priradenie v edit modali */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Priradenie</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="priradenie_typ"
                    value="vozidlo"
                    checked={priradenie === 'vozidlo'}
                    onChange={() => setPriradenie('vozidlo')}
                  />
                  Vozidlu
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="priradenie_typ"
                    value="vodic"
                    checked={priradenie === 'vodic'}
                    onChange={() => setPriradenie('vodic')}
                  />
                  Vodičovi
                </label>
              </div>
              {priradenie === 'vozidlo' ? (
                <select name="vozidlo_id" defaultValue={editing.vozidlo_id || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">-- nevybrané --</option>
                  {vozidla.map(v => (
                    <option key={v.id} value={v.id}>{v.spz} - {v.znacka}</option>
                  ))}
                </select>
              ) : (
                <select name="vodic_id" defaultValue={editing.vodic_id || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">-- nevybrané --</option>
                  {vodici.map(v => (
                    <option key={v.id} value={v.id}>{v.full_name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesačný limit (€)</label>
                <input
                  type="number"
                  name="limit_mesacny"
                  step="0.01"
                  defaultValue={editing.limit_mesacny || ''}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platnosť do</label>
                <input
                  type="date"
                  name="platnost_do"
                  defaultValue={editing.platnost_do || ''}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
              <input
                type="text"
                name="poznamka"
                defaultValue={editing.poznamka || ''}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Ukladám...' : 'Uložiť zmeny'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
