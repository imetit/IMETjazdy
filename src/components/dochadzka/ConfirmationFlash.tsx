'use client'

import type { SmerDochadzky, DovodDochadzky } from '@/lib/dochadzka-types'
import { DOVOD_LABELS } from '@/lib/dochadzka-types'
import { Check } from 'lucide-react'

interface Props {
  smer: SmerDochadzky
  dovod: DovodDochadzky
  meno: string
  cas: string
}

export default function ConfirmationFlash({ smer, dovod, meno, cas }: Props) {
  const isPrichod = smer === 'prichod'

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center ${
      isPrichod ? 'bg-green-600' : 'bg-red-600'
    } z-50`}>
      <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6">
        <Check size={48} className="text-white" />
      </div>
      <h1 className="text-4xl font-bold text-white mb-2">
        {isPrichod ? 'Príchod zaznamenaný' : 'Odchod zaznamenaný'}
      </h1>
      <p className="text-2xl text-white/80 mb-4">{meno}</p>
      <p className="text-xl text-white/70">
        {DOVOD_LABELS[dovod]} — {cas}
      </p>
    </div>
  )
}
