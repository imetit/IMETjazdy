'use client'

import { useState } from 'react'
import { Delete, Check, X } from 'lucide-react'

interface Props {
  onSubmit: (pin: string) => void
  onCancel: () => void
  loading: boolean
  error: string | null
}

export default function PinPad({ onSubmit, onCancel, loading, error }: Props) {
  const [pin, setPin] = useState('')

  function addDigit(d: string) {
    if (pin.length < 6) setPin(prev => prev + d)
  }

  function backspace() {
    setPin(prev => prev.slice(0, -1))
  }

  function submit() {
    if (pin.length >= 4) onSubmit(pin)
  }

  const btnClass = "w-20 h-20 rounded-2xl bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-2xl font-bold transition-colors flex items-center justify-center"

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-white">Zadajte PIN</h2>

      {error && <p className="text-red-400 text-lg">{error}</p>}

      <div className="flex gap-3 mb-4">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`w-5 h-5 rounded-full ${i < pin.length ? 'bg-teal-400' : 'bg-slate-600'}`} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button key={d} onClick={() => addDigit(d)} className={btnClass}>{d}</button>
        ))}
        <button onClick={backspace} className={btnClass}><Delete size={24} /></button>
        <button onClick={() => addDigit('0')} className={btnClass}>0</button>
        <button onClick={submit} disabled={pin.length < 4 || loading} className={`${btnClass} ${pin.length >= 4 ? 'bg-teal-600 hover:bg-teal-500' : 'opacity-50'}`}>
          <Check size={24} />
        </button>
      </div>

      <button onClick={onCancel} className="flex items-center gap-2 text-slate-400 hover:text-white text-lg mt-4">
        <X size={20} /> Zrušiť
      </button>
    </div>
  )
}
