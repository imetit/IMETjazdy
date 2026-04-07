'use client'

import { useState } from 'react'
import { Scale, Save } from 'lucide-react'
import { updateSadzby } from '@/actions/sadzby'
import type { Settings } from '@/lib/types'

const ic = "w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-right"

export default function SadzbyForm({ settings: initial }: { settings: Settings }) {
  const [s, setS] = useState(initial)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    await updateSadzby({
      sadzba_sukromne_auto: s.sadzba_sukromne_auto,
      stravne_doma_do5h: s.stravne_doma_do5h, stravne_doma_5do12h: s.stravne_doma_5do12h,
      stravne_doma_12do18h: s.stravne_doma_12do18h, stravne_doma_nad18h: s.stravne_doma_nad18h,
      stravne_zahr_do6h: s.stravne_zahr_do6h, stravne_zahr_6do12h: s.stravne_zahr_6do12h, stravne_zahr_nad12h: s.stravne_zahr_nad12h,
      vreckove_percento: s.vreckove_percento, dph_phm: s.dph_phm, dph_ubytovanie: s.dph_ubytovanie,
    })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const row = (label: string, key: keyof Settings, unit: string) => (
    <div className="flex items-center gap-3" key={key}>
      <span className="text-sm text-gray-600 w-40">{label}</span>
      <input type="number" step="0.01" value={s[key] as number} onChange={(e) => setS({ ...s, [key]: parseFloat(e.target.value) || 0 })} className={ic} />
      <span className="text-sm text-gray-500">{unit}</span>
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-1"><Scale className="text-primary" size={24} /><h2 className="text-2xl font-bold text-gray-900">Sadzby náhrad</h2></div>
      <p className="text-sm text-gray-500 mb-6">Zákonné sadzby podľa Zákonníka práce SR</p>
      <div className="space-y-6 max-w-2xl">
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Náhrada za 1km</h3>
          {row('Súkromné auto:', 'sadzba_sukromne_auto', '€ / km')}
        </div>
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Stravné - doma</h3>
          <div className="space-y-2">
            {row('Menej ako 5h:', 'stravne_doma_do5h', '€')}
            {row('5 - 12h:', 'stravne_doma_5do12h', '€')}
            {row('12 - 18h:', 'stravne_doma_12do18h', '€')}
            {row('Nad 18h:', 'stravne_doma_nad18h', '€')}
          </div>
        </div>
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Stravné - zahraničie</h3>
          <div className="space-y-2">
            {row('Menej ako 6h:', 'stravne_zahr_do6h', '€')}
            {row('6 - 12h:', 'stravne_zahr_6do12h', '€')}
            {row('Nad 12h:', 'stravne_zahr_nad12h', '€')}
          </div>
        </div>
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Vreckové - zahraničie</h3>
          {row('Percento:', 'vreckove_percento', '% zo stravného')}
        </div>
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">DPH sadzby</h3>
          <div className="space-y-2">
            {row('DPH - pohonné hmoty:', 'dph_phm', '%')}
            {row('DPH - ubytovanie:', 'dph_ubytovanie', '%')}
          </div>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Save size={16} /> {saved ? 'Uložené!' : 'Uložiť sadzby'}
        </button>
      </div>
    </div>
  )
}
