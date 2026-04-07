'use client'

import { useState } from 'react'
import { Save, Send } from 'lucide-react'
import { createJazda } from '@/actions/jazdy'
import FileUpload from './FileUpload'
import type { Vozidlo } from '@/lib/types'
import { PALIVO_LABELS } from '@/lib/types'

export default function JazdaForm({ vozidlo, userName }: { vozidlo: Vozidlo; userName: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await createJazda(formData)
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  return (
    <form action={handleSubmit}>
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6">{error}</div>}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-blue-900 mb-1">Vaše vozidlo</p>
        <p className="text-sm text-blue-700">
          {vozidlo.znacka} {vozidlo.variant} — <span className="font-mono">{vozidlo.spz}</span> — {PALIVO_LABELS[vozidlo.palivo]} — {vozidlo.spotreba_tp} l/100km
        </p>
      </div>

      <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mesiac</label>
            <input type="month" name="mesiac" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Odchod z</label>
            <input name="odchod_z" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Príchod do</label>
            <input name="prichod_do" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cez (nepovinné)</label>
            <input name="cez" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KM</label>
            <input type="number" name="km" step="0.1" min="0.1" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Čas odchodu</label>
            <input type="time" name="cas_odchodu" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Čas príchodu</label>
            <input type="time" name="cas_prichodu" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Bločky / Prílohy</h3>
        <FileUpload name="files" maxFiles={5} maxSizeMB={5} />
      </div>

      <div className="flex gap-3">
        <button type="submit" name="stav" value="rozpracovana" disabled={loading} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
          <Save size={16} /> Uložiť rozpracované
        </button>
        <button type="submit" name="stav" value="odoslana" disabled={loading} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          <Send size={16} /> Odoslať
        </button>
      </div>
    </form>
  )
}
