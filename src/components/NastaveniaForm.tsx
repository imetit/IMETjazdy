'use client'

import { useState } from 'react'
import { Settings, Save } from 'lucide-react'
import { updateNastavenia } from '@/actions/sadzby'
import type { Settings as SettingsType } from '@/lib/types'

export default function NastaveniaForm({ settings }: { settings: SettingsType }) {
  const [saved, setSaved] = useState(false)

  async function handleSubmit(formData: FormData) {
    await updateNastavenia(formData)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6"><Settings className="text-primary" size={24} /><h2 className="text-2xl font-bold text-gray-900">Nastavenia</h2></div>
      <form action={handleSubmit} className="bg-white rounded-card shadow-sm border border-gray-100 p-6 max-w-lg">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Firma</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Názov firmy</label>
          <input name="company_name" defaultValue={settings.company_name} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Zadajte názov firmy" />
          <p className="text-xs text-gray-400 mt-1">Zobrazí sa v hlavičke PDF exportu.</p>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Posledné číslo dokladu</label>
          <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-mono inline-block">{settings.last_doc_number}</p>
        </div>
        <button type="submit" className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Save size={16} /> {saved ? 'Uložené!' : 'Uložiť'}
        </button>
      </form>
    </div>
  )
}
