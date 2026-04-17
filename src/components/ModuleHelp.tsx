'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface Props {
  title: string
  children: React.ReactNode
}

export default function ModuleHelp({ title, children }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors mb-4"
        title="Zobraziť nápovedu"
      >
        <HelpCircle size={16} />
        <span>Ako to tu funguje?</span>
      </button>
    )
  }

  return (
    <div className="mb-6 bg-teal-50 border border-teal-200 rounded-xl p-5 relative">
      <button
        onClick={() => setOpen(false)}
        className="absolute top-3 right-3 text-teal-400 hover:text-teal-600 transition-colors"
        title="Zavrieť nápovedu"
      >
        <X size={18} />
      </button>
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle size={20} className="text-teal-600" />
        <h3 className="font-semibold text-teal-800">{title}</h3>
      </div>
      <div className="text-sm text-teal-700 space-y-2">
        {children}
      </div>
    </div>
  )
}
