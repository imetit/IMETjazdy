'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Fuel, Trash2, Check, Plus } from 'lucide-react'
import { createTankovanie, deleteTankovanie } from '@/actions/fleet-tankovanie'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import { TYP_KARTY_LABELS } from '@/lib/fleet-types'
import type { VozidloTankovanie, TankovaKarta } from '@/lib/fleet-types'

interface Props {
  vozidloId: string
  tankovanie: VozidloTankovanie[]
  karty: TankovaKarta[]
  priemerSpotreba: number | null
}

export default function TankovanieSection({ vozidloId, tankovanie, karty, priemerSpotreba }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [litrov, setLitrov] = useState('')
  const [cenaZaLiter, setCenaZaLiter] = useState('')
  const router = useRouter()

  const celkovaCena = litrov && cenaZaLiter
    ? (parseFloat(litrov) * parseFloat(cenaZaLiter)).toFixed(2)
    : ''

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.set('vozidlo_id', vozidloId)
    if (celkovaCena) formData.set('celkova_cena', celkovaCena)

    const result = await createTankovanie(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setShowForm(false)
      setLitrov('')
      setCenaZaLiter('')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj chcete zmazať toto tankovanie?')) return
    const result = await deleteTankovanie(id)
    if (result?.error) setError(result.error)
    else router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Priemerná spotreba */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <Fuel size={20} className="text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          Priemerná spotreba:{' '}
          {priemerSpotreba !== null ? (
            <span className="text-lg font-bold">{priemerSpotreba} L/100km</span>
          ) : (
            <span className="text-gray-500">Nedostatok dát</span>
          )}
        </span>
      </div>

      {/* Tlačidlo pridať */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus size={16} />
          Pridať tankovanie
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Formulár */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dátum *</label>
              <input
                type="date"
                name="datum"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Litrov *</label>
              <input
                type="number"
                name="litrov"
                step="0.01"
                required
                value={litrov}
                onChange={e => setLitrov(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cena za liter (€)</label>
              <input
                type="number"
                name="cena_za_liter"
                step="0.001"
                value={cenaZaLiter}
                onChange={e => setCenaZaLiter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Celková cena (€)</label>
              <input
                type="number"
                name="celkova_cena"
                step="0.01"
                value={celkovaCena}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Km na tachometri</label>
              <input
                type="number"
                name="km_na_tachometri"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanková karta</label>
              <select name="tankova_karta_id" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">-- bez karty --</option>
                {karty.filter(k => k.stav === 'aktivna').map(k => (
                  <option key={k.id} value={k.id}>
                    {k.cislo_karty} ({TYP_KARTY_LABELS[k.typ] || k.typ})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="plna_naplna" defaultChecked className="rounded" />
              Plná náplň
            </label>
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
              <th className="text-left px-4 py-3 font-medium text-gray-500">Dátum</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Litrov</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Cena/liter</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Celková cena</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Km</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Plná</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Karta</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Tankoval</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tankovanie.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Žiadne tankovania
                </td>
              </tr>
            ) : (
              tankovanie.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(t.datum)}</td>
                  <td className="px-4 py-3 text-right">{t.litrov.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    {t.cena_za_liter ? `${t.cena_za_liter.toFixed(3)} €` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(t.celkova_cena)}</td>
                  <td className="px-4 py-3 text-right">
                    {t.km_na_tachometri ? t.km_na_tachometri.toLocaleString('sk-SK') : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.plna_naplna && <Check size={16} className="inline text-green-600" />}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.tankova_karta ? `${t.tankova_karta.cislo_karty}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.profile?.full_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Zmazať"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
