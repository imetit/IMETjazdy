'use client'

import type { DovodDochadzky } from '@/lib/dochadzka-types'
import { DOVOD_LABELS, DOVOD_ICONS } from '@/lib/dochadzka-types'

interface Props {
  onSelect: (dovod: DovodDochadzky) => void
  loading: boolean
}

const DOVODY: DovodDochadzky[] = [
  'praca', 'obed', 'lekar', 'lekar_doprovod', 'sluzobne',
  'sluzobna_cesta', 'prechod', 'fajcenie', 'sukromne', 'dovolenka',
]

export default function DovodButtons({ onSelect, loading }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto">
      {DOVODY.map(dovod => (
        <button
          key={dovod}
          onClick={() => onSelect(dovod)}
          disabled={loading}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl px-4 py-5 min-h-[90px] text-white font-medium transition-all ${
            dovod === 'praca'
              ? 'bg-teal-600 hover:bg-teal-500 ring-2 ring-teal-400'
              : 'bg-slate-700 hover:bg-slate-600'
          } active:scale-95 disabled:opacity-50`}
        >
          <span className="text-2xl">{DOVOD_ICONS[dovod]}</span>
          <span className="text-sm">{DOVOD_LABELS[dovod]}</span>
        </button>
      ))}
    </div>
  )
}
