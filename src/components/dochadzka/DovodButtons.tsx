'use client'

import type { DovodDochadzky, SmerDochadzky } from '@/lib/dochadzka-types'
import { labelForSmer, DOVODY_PRE_SMER } from '@/lib/dochadzka-types'
import {
  Briefcase, Utensils, Stethoscope, HeartHandshake, ClipboardList,
  Car, Repeat, Cigarette, Home,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICONS: Record<DovodDochadzky, LucideIcon> = {
  praca: Briefcase,
  obed: Utensils,
  lekar: Stethoscope,
  lekar_doprovod: HeartHandshake,
  sluzobne: ClipboardList,
  sluzobna_cesta: Car,
  prechod: Repeat,
  fajcenie: Cigarette,
  sukromne: Home,
  dovolenka: Briefcase,
}

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
        const Icon = ICONS[dovod]
        return (
          <button
            key={dovod}
            onClick={() => onSelect(dovod)}
            disabled={loading}
            className={`flex flex-col items-center justify-center gap-3 rounded-3xl px-4 py-6 min-h-[130px] font-medium transition-all active:scale-95 disabled:opacity-50 ${
              primary
                ? 'bg-teal-600 hover:bg-teal-500 text-white ring-4 ring-teal-400/60 shadow-lg shadow-teal-900/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
            }`}
          >
            <Icon size={primary ? 44 : 38} strokeWidth={1.6} />
            <span className={`${primary ? 'text-lg' : 'text-base'}`}>{labelForSmer(dovod, smer)}</span>
          </button>
        )
      })}
    </div>
  )
}
