'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react'

export interface ManualSection {
  id: string
  title: string
  content: React.ReactNode
}

export default function ManualPage({ title, sections }: { title: string; sections: ManualSection[] }) {
  const [open, setOpen] = useState<string[]>([sections[0]?.id])

  function toggle(id: string) {
    setOpen(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle size={28} className="text-primary" />
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>
      <p className="text-gray-500 text-sm">Kliknite na sekciu pre zobrazenie detailného návodu.</p>

      <div className="space-y-2">
        {sections.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggle(s.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              {open.includes(s.id) ? <ChevronDown size={18} className="text-primary shrink-0" /> : <ChevronRight size={18} className="text-gray-400 shrink-0" />}
              <span className="font-medium text-gray-900">{s.title}</span>
            </button>
            {open.includes(s.id) && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <div className="text-sm text-gray-700 pt-4 space-y-3">
                  {s.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
