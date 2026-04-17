'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setTachoZaznam } from '@/actions/vozidlo-vodici'

interface TachoZaznam {
  id: string
  mesiac: string
  stav_km: number
  zapisal_id: string
  poznamka: string | null
  zapisal?: { full_name: string }
}

interface Props {
  vozidloId: string
  zaznamy: TachoZaznam[]
}

export default function TachoSection({ vozidloId, zaznamy }: Props) {
  const router = useRouter()
  const [mesiac, setMesiac] = useState('')
  const [stavKm, setStavKm] = useState('')
  const [poznamka, setPoznamka] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lastKm = zaznamy.length > 0 ? zaznamy[0].stav_km : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const kmValue = Number(stavKm)
    if (!mesiac) {
      setError('Vyberte mesiac')
      return
    }
    if (!stavKm || isNaN(kmValue) || kmValue < 0) {
      setError('Zadajte platný stav km')
      return
    }
    if (kmValue < lastKm) {
      setError(`Stav km musí byť >= ${lastKm.toLocaleString('sk-SK')} km (posledný záznam)`)
      return
    }

    setLoading(true)
    const result = await setTachoZaznam(vozidloId, mesiac, kmValue, poznamka || undefined)
    if (result?.error) {
      setError(result.error)
    } else {
      setMesiac('')
      setStavKm('')
      setPoznamka('')
      router.refresh()
    }
    setLoading(false)
  }

  // Format month string YYYY-MM to readable Slovak format
  function formatMesiac(m: string) {
    const [year, month] = m.split('-')
    const monthNames = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December']
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Nový záznam tachometra</h3>
        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mesiac</label>
              <input
                type="month"
                value={mesiac}
                onChange={e => setMesiac(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stav km</label>
              <input
                type="number"
                value={stavKm}
                onChange={e => setStavKm(e.target.value)}
                placeholder={lastKm > 0 ? `min. ${lastKm.toLocaleString('sk-SK')}` : '0'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
              <input
                type="text"
                value={poznamka}
                onChange={e => setPoznamka(e.target.value)}
                placeholder="Voliteľná poznámka"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Ukladám...' : 'Uložiť záznam'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">História tachometra</h3>
        {zaznamy.length === 0 ? (
          <p className="text-gray-500 text-sm">Žiadne záznamy</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">Mesiac</th>
                <th className="pb-2 font-medium text-right">Stav km</th>
                <th className="pb-2 font-medium text-right">Rozdiel</th>
                <th className="pb-2 font-medium">Zapísal</th>
                <th className="pb-2 font-medium">Poznámka</th>
              </tr>
            </thead>
            <tbody>
              {zaznamy.map((z, i) => {
                const prevKm = i < zaznamy.length - 1 ? zaznamy[i + 1].stav_km : null
                const diff = prevKm !== null ? z.stav_km - prevKm : null
                return (
                  <tr key={z.id} className="border-b border-gray-100">
                    <td className="py-2">{formatMesiac(z.mesiac)}</td>
                    <td className="py-2 text-right font-medium">{z.stav_km.toLocaleString('sk-SK')} km</td>
                    <td className="py-2 text-right text-gray-500">
                      {diff !== null ? `+${diff.toLocaleString('sk-SK')} km` : '—'}
                    </td>
                    <td className="py-2">{z.zapisal?.full_name || '—'}</td>
                    <td className="py-2 text-gray-600">{z.poznamka || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
