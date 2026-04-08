'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import { PALIVO_LABELS, type Vozidlo } from '@/lib/types'
import { TYP_VOZIDLA_LABELS, STAV_VOZIDLA_LABELS } from '@/lib/fleet-types'

interface Props {
  vozidlo?: Vozidlo & { vin?: string; rok_vyroby?: number; farba?: string; typ_vozidla?: string; stav?: string; stredisko?: string; aktualne_km?: number; priradeny_vodic_id?: string }
  vodici: { id: string; full_name: string; email: string }[]
  onSubmit: (formData: FormData) => Promise<{ error?: string } | undefined>
  onClose: () => void
}

export default function VozidloFleetModal({ vozidlo, vodici, onSubmit, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await onSubmit(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      onClose()
    }
  }

  return (
    <Modal onClose={onClose} title={vozidlo ? 'Upraviť vozidlo' : 'Nové vozidlo'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Značka *</label>
            <input name="znacka" defaultValue={vozidlo?.znacka} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model / Variant</label>
            <input name="variant" defaultValue={vozidlo?.variant} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ŠPZ *</label>
            <input name="spz" defaultValue={vozidlo?.spz} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
            <input name="vin" defaultValue={vozidlo?.vin} maxLength={17} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rok výroby</label>
            <input name="rok_vyroby" type="number" defaultValue={vozidlo?.rok_vyroby} min={1990} max={2030} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Farba</label>
            <input name="farba" defaultValue={vozidlo?.farba} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ vozidla</label>
            <select name="typ_vozidla" defaultValue={vozidlo?.typ_vozidla || 'osobne'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {Object.entries(TYP_VOZIDLA_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Druh</label>
            <select name="druh" defaultValue={vozidlo?.druh || 'osobne'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="osobne">Osobné</option>
              <option value="nakladne">Nákladné</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Palivo</label>
            <select name="palivo" defaultValue={vozidlo?.palivo || 'diesel'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {Object.entries(PALIVO_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spotreba (l/100km) *</label>
            <input name="spotreba_tp" type="number" step="0.1" min="0" defaultValue={vozidlo?.spotreba_tp} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objem motora (cm³)</label>
            <input name="objem_motora" type="number" defaultValue={vozidlo?.objem_motora || 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stredisko</label>
            <input name="stredisko" defaultValue={vozidlo?.stredisko} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aktuálne km</label>
            <input name="aktualne_km" type="number" defaultValue={vozidlo?.aktualne_km || 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
            <select name="stav" defaultValue={vozidlo?.stav || 'aktivne'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {Object.entries(STAV_VOZIDLA_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priradený vodič</label>
            <select name="priradeny_vodic_id" defaultValue={vozidlo?.priradeny_vodic_id || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Nepriradený —</option>
              {vodici.map(v => (
                <option key={v.id} value={v.id}>{v.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Zrušiť</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {loading ? 'Ukladám...' : vozidlo ? 'Uložiť' : 'Vytvoriť'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
