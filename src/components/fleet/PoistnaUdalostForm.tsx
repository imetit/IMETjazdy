'use client'

import { useState } from 'react'
import { createPoistnaUdalost, updatePoistnaUdalostStav, updatePoistnaUdalostFinance } from '@/actions/fleet-poistne'
import { useRouter } from 'next/navigation'
import { STAV_POISTNEJ_LABELS, POISTNA_STAV_TRANSITIONS } from '@/lib/fleet-types'
import type { Vozidlo } from '@/lib/types'

interface PoistnaUdalostData {
  id: string
  stav: string
  cislo_poistky?: string | null
  skoda_odhad?: number | null
  skoda_skutocna?: number | null
  poistovna_plnenie?: number | null
  spoluucast?: number | null
}

interface Props {
  vozidlo: Vozidlo
  userName: string
  existingEvent?: PoistnaUdalostData
}

export default function PoistnaUdalostForm({ vozidlo, userName, existingEvent }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [policajnaSprava, setPolicajnaSprava] = useState(false)
  const router = useRouter()

  // Financial fields state (for existing events)
  const [cisloPoistky, setCisloPoistky] = useState(existingEvent?.cislo_poistky || '')
  const [skodaOdhad, setSkodaOdhad] = useState(existingEvent?.skoda_odhad ?? '')
  const [skodaSkutocna, setSkodaSkutocna] = useState(existingEvent?.skoda_skutocna ?? '')
  const [poistovnaPlnenie, setPoistovnaPlnenie] = useState(existingEvent?.poistovna_plnenie ?? '')

  const spoluucast = typeof skodaSkutocna === 'number' && typeof poistovnaPlnenie === 'number'
    ? Math.max(0, Number(skodaSkutocna) - Number(poistovnaPlnenie))
    : existingEvent?.spoluucast ?? null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    formData.set('vozidlo_id', vozidlo.id)
    formData.set('policajna_sprava', policajnaSprava ? 'true' : 'false')
    const result = await createPoistnaUdalost(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      e.currentTarget.reset()
    }
    setLoading(false)
    router.refresh()
  }

  async function handleSaveFinance() {
    if (!existingEvent) return
    setLoading(true)
    setError('')
    const result = await updatePoistnaUdalostFinance(existingEvent.id, {
      cislo_poistky: cisloPoistky || undefined,
      skoda_odhad: skodaOdhad !== '' ? Number(skodaOdhad) : undefined,
      skoda_skutocna: skodaSkutocna !== '' ? Number(skodaSkutocna) : undefined,
      poistovna_plnenie: poistovnaPlnenie !== '' ? Number(poistovnaPlnenie) : undefined,
      spoluucast: spoluucast !== null ? Number(spoluucast) : undefined,
    })
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
    setLoading(false)
    router.refresh()
  }

  async function handleChangeStav(newStav: string) {
    if (!existingEvent) return
    setLoading(true)
    setError('')
    const result = await updatePoistnaUdalostStav(existingEvent.id, newStav)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
    setLoading(false)
    router.refresh()
  }

  // If editing existing event, show financial form
  if (existingEvent) {
    const nextStates = POISTNA_STAV_TRANSITIONS[existingEvent.stav] || []
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Finančné údaje poistnej udalosti</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            existingEvent.stav === 'vyriesena' || existingEvent.stav === 'uzavreta'
              ? 'bg-green-100 text-green-700'
              : existingEvent.stav === 'zamietnuta'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
          }`}>
            {STAV_POISTNEJ_LABELS[existingEvent.stav] || existingEvent.stav}
          </span>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">Uložené.</p>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Číslo poistky</label>
            <input
              type="text"
              value={cisloPoistky}
              onChange={e => setCisloPoistky(e.target.value)}
              placeholder="Napr. POI-2026-001"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Odhadovaná škoda (EUR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={skodaOdhad}
                onChange={e => setSkodaOdhad(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skutočná škoda (EUR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={skodaSkutocna}
                onChange={e => setSkodaSkutocna(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plnenie poisťovne (EUR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={poistovnaPlnenie}
                onChange={e => setPoistovnaPlnenie(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spoluúčasť (EUR)</label>
              <input
                type="number"
                value={spoluucast ?? ''}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">Automaticky: skutočná - plnenie</p>
            </div>
          </div>

          <button
            onClick={handleSaveFinance}
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Ukladám...' : 'Uložiť finančné údaje'}
          </button>
        </div>

        {/* Financial summary */}
        {(skodaSkutocna !== '' || poistovnaPlnenie !== '' || spoluucast !== null) && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Finančný súhrn</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Škoda</p>
                <p className="font-semibold text-lg">{skodaSkutocna !== '' ? `${Number(skodaSkutocna).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR` : '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Poisťovňa hradí</p>
                <p className="font-semibold text-lg text-green-600">{poistovnaPlnenie !== '' ? `${Number(poistovnaPlnenie).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR` : '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Spoluúčasť</p>
                <p className="font-semibold text-lg text-red-600">{spoluucast !== null ? `${Number(spoluucast).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR` : '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* State transition buttons */}
        {nextStates.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Zmeniť stav</h4>
            <div className="flex gap-2 flex-wrap">
              {nextStates.map(s => (
                <button
                  key={s}
                  onClick={() => handleChangeStav(s)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    s === 'vyriesena' ? 'bg-green-600 hover:bg-green-700 text-white'
                      : s === 'zamietnuta' ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {STAV_POISTNEJ_LABELS[s] || s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // New event form (original)
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4">
      <h3 className="text-lg font-semibold">Nahlásiť poistnú udalosť</h3>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">Poistná udalosť bola nahlásená.</p>}

      {/* Pre-filled vehicle info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Vozidlo:</span><span className="font-medium">{vozidlo.znacka} {vozidlo.variant}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">SPZ:</span><span className="font-medium font-mono">{vozidlo.spz}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">VIN:</span><span className="font-medium font-mono">{vozidlo.vin || '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Nahlasuje:</span><span className="font-medium">{userName}</span></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Datum udalosti *</label>
          <input name="datum" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cas</label>
          <input name="cas" type="time" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Miesto udalosti *</label>
        <input name="miesto" required placeholder="Napr. Bratislava, Bajkalska ul., krizovatka..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Popis udalosti *</label>
        <textarea name="popis" required rows={4} placeholder="Detailne popiste co sa stalo..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Popis skody</label>
        <textarea name="skoda_popis" rows={2} placeholder="Ake poskodenia vznikli..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Svedkovia</label>
        <input name="svedkovia" placeholder="Mena a kontakty svedkov (ak boli)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={policajnaSprava} onChange={e => setPolicajnaSprava(e.target.checked)} className="rounded border-gray-300" />
        <span className="text-sm font-medium text-gray-700">Bola privolana policia</span>
      </label>

      <button type="submit" disabled={loading} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
        {loading ? 'Odosielam...' : 'Nahlasit poistnu udalost'}
      </button>
    </form>
  )
}
