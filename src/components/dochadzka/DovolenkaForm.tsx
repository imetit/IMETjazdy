// src/components/dochadzka/DovolenkaForm.tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Dovolenka, TypDovolenky } from '@/lib/dovolenka-types'
import { TYP_DOVOLENKY_LABELS, STAV_DOVOLENKY_LABELS, STAV_DOVOLENKY_COLORS, CAST_DNA_LABELS } from '@/lib/dovolenka-types'
import { createDovolenka } from '@/actions/dovolenky'
import { formatDate } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'

interface Props {
  dovolenky: Dovolenka[]
  narok: { narok: number; cerpane: number; zostatok: number }
}

export default function DovolenkaForm({ dovolenky, narok }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [datumOd, setDatumOd] = useState('')
  const [datumDo, setDatumDo] = useState('')
  const [polDna, setPolDna] = useState(false)
  const router = useRouter()

  // Pol dňa je možný iba pri 1-dňovej žiadosti
  const isSingleDay = datumOd !== '' && datumOd === datumDo
  const canUsePolDna = isSingleDay

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    if (!canUsePolDna && formData.get('pol_dna')) {
      formData.delete('pol_dna')
      formData.delete('cast_dna')
    }
    const result = await createDovolenka(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setShowForm(false)
      setDatumOd(''); setDatumDo(''); setPolDna(false)
      e.currentTarget.reset()
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dovolenka</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nová žiadosť
        </button>
      </div>

      {/* Nárok */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Nárok</p>
          <p className="text-xl font-bold">{narok.narok} dní</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Čerpané</p>
          <p className="text-xl font-bold text-orange-600">{narok.cerpane} dní</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Zostatok</p>
          <p className={`text-xl font-bold ${narok.zostatok > 0 ? 'text-green-600' : 'text-red-600'}`}>{narok.zostatok} dní</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Nová žiadosť o dovolenku</h3>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Od *</label>
                <input name="datum_od" type="date" required value={datumOd} onChange={e => { setDatumOd(e.target.value); if (e.target.value !== datumDo) setPolDna(false) }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Do *</label>
                <input name="datum_do" type="date" required value={datumDo} onChange={e => { setDatumDo(e.target.value); if (e.target.value !== datumOd) setPolDna(false) }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ *</label>
              <select name="typ" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {(Object.keys(TYP_DOVOLENKY_LABELS) as TypDovolenky[]).map(t => (
                  <option key={t} value={t}>{TYP_DOVOLENKY_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* Pol dňa — iba keď jednoduchá 1-dňová žiadosť */}
            <div className={`rounded-lg border p-3 ${canUsePolDna ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="pol_dna"
                  checked={polDna}
                  onChange={e => setPolDna(e.target.checked)}
                  disabled={!canUsePolDna}
                  value="true"
                />
                Pol dňa
                {!canUsePolDna && <span className="text-xs text-gray-400 font-normal">(iba pri žiadosti na jeden deň)</span>}
              </label>
              {polDna && canUsePolDna && (
                <div className="mt-2">
                  <select name="cast_dna" required className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                    {(Object.keys(CAST_DNA_LABELS) as Array<keyof typeof CAST_DNA_LABELS>).map(k => (
                      <option key={k} value={k}>{CAST_DNA_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
              <textarea name="poznamka" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Zrušiť</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                {loading ? 'Odosielam...' : 'Odoslať žiadosť'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Obdobie</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 font-medium">Stav</th>
              <th className="px-4 py-3 font-medium">Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {dovolenky.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Žiadne žiadosti</td></tr>
            )}
            {dovolenky.map(d => (
              <tr key={d.id} className="border-b border-gray-100">
                <td className="px-4 py-3">{formatDate(d.datum_od)} — {formatDate(d.datum_do)}</td>
                <td className="px-4 py-3">{TYP_DOVOLENKY_LABELS[d.typ]}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STAV_DOVOLENKY_COLORS[d.stav]}`}>
                    {STAV_DOVOLENKY_LABELS[d.stav]}
                  </span>
                  {d.dovod_zamietnutia && <p className="text-xs text-red-500 mt-1">{d.dovod_zamietnutia}</p>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{d.poznamka || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
