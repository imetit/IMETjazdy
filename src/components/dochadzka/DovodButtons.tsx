'use client'

import type { DovodDochadzky, SmerDochadzky } from '@/lib/dochadzka-types'
import { DOVOD_ICONS, labelForSmer, DOVODY_PRE_SMER } from '@/lib/dochadzka-types'

interface Props {
  smer: SmerDochadzky
  onSelect: (dovod: DovodDochadzky) => void
  loading?: boolean
}

export default function DovodButtons({ smer, onSelect, loading = false }: Props) {
  const dovody = DOVODY_PRE_SMER[smer]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-5xl mx-auto w-full">
      {dovody.map(dovod => {
        const primary = dovod === 'praca'
        return (
          <button
            key={dovod}
            onClick={() => onSelect(dovod)}
            disabled={loading}
            className={`flex flex-col items-center justify-center gap-2 rounded-3xl px-4 py-6 min-h-[120px] text-white font-medium transition-all active:scale-95 disabled:opacity-50 ${
              primary
                ? 'bg-teal-600 hover:bg-teal-500 ring-4 ring-teal-400/60 shadow-lg shadow-teal-900/40'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            <span className="text-4xl">{DOVOD_ICONS[dovod]}</span>
            <span className={`${primary ? 'text-lg' : 'text-base'}`}>{labelForSmer(dovod, smer)}</span>
          </button>
        )
      })}
    </div>
  )
}
