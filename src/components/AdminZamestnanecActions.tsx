'use client'

import { useState } from 'react'
import { FileDown, LogOut, CheckCircle } from 'lucide-react'
import { generateZamestnanecPDF } from '@/lib/pdf-zamestnanec'
import { startOffboarding, completeOffboarding } from '@/actions/onboarding'
import { useRouter } from 'next/navigation'
import type { Profile, Vozidlo } from '@/lib/types'

interface Props {
  profile: Profile
  vozidlo: Vozidlo | null
  majetok: any[]
  licencie: any[]
  skolenia: any[]
  firma: any
  hasOffboardingItems: boolean
}

export default function AdminZamestnanecActions({ profile, vozidlo, majetok, licencie, skolenia, firma, hasOffboardingItems }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function handleExportPDF() {
    generateZamestnanecPDF(profile, vozidlo, majetok, licencie, skolenia, firma)
  }

  async function handleStartOffboarding() {
    if (!confirm('Naozaj spustiť offboarding pre tohto zamestnanca?')) return
    setLoading(true)
    setError('')
    const result = await startOffboarding(profile.id)
    if (result?.error) setError(result.error)
    setLoading(false)
    router.refresh()
  }

  async function handleCompleteOffboarding() {
    if (!confirm('Dokončiť offboarding? Zamestnanec bude deaktivovaný.')) return
    setLoading(true)
    setError('')
    const result = await completeOffboarding(profile.id)
    if (result?.error) setError(result.error)
    setLoading(false)
    router.refresh()
  }

  const offboardingStav = (profile as any).offboarding_stav

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Akcie</h3>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {offboardingStav === 'zahajeny' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-800 font-medium">Offboarding prebieha</p>
          <p className="text-xs text-orange-600 mt-1">Skontrolujte splnenie všetkých položiek offboardingu vyššie.</p>
        </div>
      )}

      {offboardingStav === 'dokonceny' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-600 font-medium">Offboarding dokončený</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExportPDF}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <FileDown size={16} /> Exportovať PDF
        </button>

        {!offboardingStav && profile.active && (
          <button
            onClick={handleStartOffboarding}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            <LogOut size={16} /> Spustiť offboarding
          </button>
        )}

        {offboardingStav === 'zahajeny' && (
          <button
            onClick={handleCompleteOffboarding}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle size={16} /> Dokončiť offboarding
          </button>
        )}
      </div>
    </div>
  )
}
