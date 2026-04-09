'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import type { SmerDochadzky, DovodDochadzky, IdentifiedUser } from '@/lib/dochadzka-types'
import { identifyByRfid, identifyByPin, getMesacnyStav, recordDochadzka } from '@/actions/dochadzka'
import { formatMinutyNaHodiny } from '@/lib/dochadzka-utils'
import PinPad from './PinPad'
import DovodButtons from './DovodButtons'
import ConfirmationFlash from './ConfirmationFlash'

type Screen = 'idle' | 'pin' | 'dovod' | 'confirm'

interface Props {
  defaultSmer: SmerDochadzky
}

export default function TabletScreen({ defaultSmer }: Props) {
  const [screen, setScreen] = useState<Screen>('idle')
  const [smer] = useState<SmerDochadzky>(defaultSmer)
  const [user, setUser] = useState<IdentifiedUser | null>(null)
  const [stavRozdiel, setStavRozdiel] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastDovod, setLastDovod] = useState<DovodDochadzky>('praca')
  const [lastCas, setLastCas] = useState('')
  const [time, setTime] = useState(new Date())
  const [identZdroj, setIdentZdroj] = useState<'pin' | 'rfid'>('rfid')
  const rfidInputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-return timeout
  useEffect(() => {
    if (screen === 'dovod') {
      timeoutRef.current = setTimeout(() => resetToIdle(), 15000)
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
    }
    if (screen === 'confirm') {
      timeoutRef.current = setTimeout(() => resetToIdle(), 3000)
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
    }
  }, [screen])

  // Keep RFID input focused on idle
  useEffect(() => {
    if (screen === 'idle') {
      rfidInputRef.current?.focus()
      const interval = setInterval(() => rfidInputRef.current?.focus(), 500)
      return () => clearInterval(interval)
    }
  }, [screen])

  function resetToIdle() {
    setScreen('idle')
    setUser(null)
    setStavRozdiel(null)
    setError(null)
    setLoading(false)
  }

  const handleIdentified = useCallback(async (identified: IdentifiedUser, zdroj: 'pin' | 'rfid') => {
    setUser(identified)
    setIdentZdroj(zdroj)
    setScreen('dovod')
    setLoading(true)
    const mesacnyStav = await getMesacnyStav(identified.id, identified.pracovny_fond_hodiny)
    setStavRozdiel(mesacnyStav.rozdiel_min)
    setLoading(false)
  }, [])

  async function handleRfidInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const kod = rfidInputRef.current?.value?.trim()
    if (!kod) return
    rfidInputRef.current!.value = ''

    setLoading(true)
    setError(null)
    const result = await identifyByRfid(kod)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      setTimeout(() => setError(null), 3000)
    } else if (result.data) {
      await handleIdentified(result.data, 'rfid')
    }
  }

  async function handlePinSubmit(pin: string) {
    setLoading(true)
    setError(null)
    const result = await identifyByPin(pin)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.data) {
      await handleIdentified(result.data, 'pin')
    }
  }

  async function handleDovodSelect(dovod: DovodDochadzky) {
    if (!user) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setLoading(true)

    const result = await recordDochadzka(user.id, smer, dovod, identZdroj)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setLastDovod(dovod)
      setLastCas(time.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }))
      setScreen('confirm')
    }
  }

  const isPrichod = smer === 'prichod'
  const dateStr = time.toLocaleDateString('sk-SK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = time.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  if (screen === 'confirm' && user) {
    return <ConfirmationFlash smer={smer} dovod={lastDovod} meno={user.full_name} cas={lastCas} />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 select-none">
      <div className={`px-8 py-3 rounded-full text-2xl font-bold mb-8 ${
        isPrichod ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {isPrichod ? 'PRÍCHOD' : 'ODCHOD'}
      </div>

      <div className="text-7xl font-bold text-white mb-2 font-mono tabular-nums">{timeStr}</div>
      <div className="text-xl text-slate-400 mb-10 capitalize">{dateStr}</div>

      {screen === 'idle' && (
        <div className="flex flex-col items-center gap-8">
          {error && <p className="text-red-400 text-xl animate-pulse">{error}</p>}

          <p className="text-2xl text-slate-300">Priložte kartu alebo zadajte PIN</p>

          <input
            ref={rfidInputRef}
            type="text"
            autoFocus
            onKeyDown={handleRfidInput}
            className="absolute opacity-0 w-0 h-0"
            tabIndex={-1}
          />

          <button
            onClick={() => setScreen('pin')}
            className="px-8 py-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white text-xl font-medium transition-colors"
          >
            Zadať PIN
          </button>

          <div className="mt-8 opacity-30">
            <Image src="/imet-logo.png" alt="IMET" width={48} height={48} />
          </div>
        </div>
      )}

      {screen === 'pin' && (
        <PinPad
          onSubmit={handlePinSubmit}
          onCancel={resetToIdle}
          loading={loading}
          error={error}
        />
      )}

      {screen === 'dovod' && user && (
        <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
          <h2 className="text-3xl font-bold text-white">{user.full_name}</h2>

          {stavRozdiel !== null && (
            <div className={`text-2xl font-bold ${stavRozdiel >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatMinutyNaHodiny(stavRozdiel)}
            </div>
          )}

          <DovodButtons onSelect={handleDovodSelect} loading={loading} />

          <button onClick={resetToIdle} className="text-slate-500 hover:text-slate-300 text-sm mt-4">
            Zrušiť
          </button>
        </div>
      )}
    </div>
  )
}
