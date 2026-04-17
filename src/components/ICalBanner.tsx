'use client'

import { useState } from 'react'
import { Calendar, Copy, Check } from 'lucide-react'

interface Props {
  token: string
}

export default function ICalBanner({ token }: Props) {
  const [copied, setCopied] = useState(false)

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/api/cal/${token}`
    : `/api/cal/${token}`

  async function handleCopy() {
    const fullUrl = `${window.location.origin}/api/cal/${token}`
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-teal-100 rounded-lg">
          <Calendar size={20} className="text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-teal-900">Outlook kalendár</h3>
          <p className="text-sm text-teal-700 mt-1">
            Pridajte si dovolenky a služobné cesty do Outlook
          </p>

          <div className="flex gap-2 mt-3">
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm text-gray-700 font-mono"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Skopírované!' : 'Kopírovať'}
            </button>
          </div>

          <p className="text-xs text-teal-600 mt-2">
            Súbor → Nastavenia konta → Internetové kalendáre → Nové → vložte link
          </p>
        </div>
      </div>
    </div>
  )
}
