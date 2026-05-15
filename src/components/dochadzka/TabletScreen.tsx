'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import type { SmerDochadzky, DovodDochadzky, IdentifiedUser } from '@/lib/dochadzka-types'
import { labelForSmer } from '@/lib/dochadzka-types'
import { identifyByRfid, identifyByPin, recordDochadzka } from '@/actions/dochadzka'
import PinPad from './PinPad'
import DovodButtons from './DovodButtons'
import ConfirmationFlash from './ConfirmationFlash'

type Screen = 'select_dovod' | 'identify' | 'pin' | 'confirm'

interface Props {
  defaultSmer: SmerDochadzky
  demoMode?: boolean
}

export default function TabletScreen({ defaultSmer, demoMode = false }: Props) {
  const [screen, setScreen] = useState<Screen>(demoMode ? 'confirm' : 'select_dovod')
  const [smer] = useState<SmerDochadzky>(defaultSmer)
  const [selectedDovod, setSelectedDovod] = useState<DovodDochadzky>('praca')
  const [user, setUser] = useState<IdentifiedUser | null>(
    demoMode ? { id: 'demo', full_name: 'Ján Novák (Demo)', pracovny_fond_hodiny: 8.5, token: 'demo' } : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCas, setLastCas] = useState('')
  const [time, setTime] = useState(new Date())
  const rfidInputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Hodiny
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const resetToStart = useCallback(() => {
    setScreen('select_dovod')
    setSelectedDovod('praca')
    setUser(null)
    setError(null)
    setLoading(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  // Kiosk: block Android back gesture + reset pri návrate z pozadia
  useEffect(() => {
    if (demoMode) return
    history.pushState(null, '', window.location.href)
    const onPop = () => {
      history.pushState(null, '', window.location.href)
      resetToStart()
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') resetToStart()
    }
    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    window.addEventListener('popstate', onPop)
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('contextmenu', onContextMenu)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('contextmenu', onContextMenu)
    }
  }, [demoMode, resetToStart])

  // Auto-timeout: identify (20s), confirm (3s)
  useEffect(() => {
    if (demoMode) return
    if (screen === 'identify') {
      timeoutRef.current = setTimeout(resetToStart, 20000)
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
    }
    if (screen === 'confirm') {
      timeoutRef.current = setTimeout(resetToStart, 3000)
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
    }
  }, [screen, demoMode, resetToStart])

  // RFID input focus počas identify
  useEffect(() => {
    if (screen === 'identify') {
      rfidInputRef.current?.focus()
      const interval = setInterval(() => rfidInputRef.current?.focus(), 500)
      return () => clearInterval(interval)
    }
  }, [screen])

  function onDovodSelect(dovod: DovodDochadzky) {
    setSelectedDovod(dovod)
    setError(null)
    setScreen('identify')
  }

  async function finalizeZapis(identified: IdentifiedUser, zdroj: 'pin' | 'rfid') {
    // Phase 1 hardening: posielame token, nie user_id (server extrahuje user_id
    // z tokenu — eliminuje falšovanie dochádzky cudzieho zamestnanca).
    const result = await recordDochadzka(identified.token, smer, selectedDovod, zdroj)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setUser(identified)
    setLastCas(new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }))
    setScreen('confirm')
    setLoading(false)
  }

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
      await finalizeZapis(result.data, 'rfid')
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
      await finalizeZapis(result.data, 'pin')
    }
  }

  const isPrichod = smer === 'prichod'
  const dateStr = time.toLocaleDateString('sk-SK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = time.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  if (screen === 'confirm' && user) {
    return <ConfirmationFlash smer={smer} dovod={selectedDovod} meno={user.full_name} cas={lastCas} />
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-6 pt-6 select-none bg-slate-900 text-white">
      <Image src="/imet-logo.png" alt="IMET" width={120} height={120} priority className="mb-4" />

      <div className={`px-8 py-3 rounded-full text-2xl font-bold mb-5 ${
        isPrichod ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {isPrichod ? 'PRÍCHOD' : 'ODCHOD'}
      </div>

      <div className="text-4xl sm:text-6xl font-bold text-white mb-1 font-mono tabular-nums">{timeStr}</div>
      <div className="text-base sm:text-lg text-slate-400 mb-8 capitalize">{dateStr}</div>

      {screen === 'select_dovod' && (
        <div className="w-full flex flex-col items-center gap-6">
          <p className="text-xl text-slate-300">Vyberte dôvod</p>
          <DovodButtons smer={smer} onSelect={onDovodSelect} loading={loading} />
        </div>
      )}

      {screen === 'identify' && (
        <div className="flex flex-col items-center gap-8 w-full max-w-xl">
          <div className="px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-xl">
            Dôvod: <span className="font-bold text-teal-400">{labelForSmer(selectedDovod, smer)}</span>
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 border-red-500/60 bg-red-500/10 text-red-200 text-xl animate-pulse">
              <span aria-hidden className="text-2xl">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <p className="text-3xl text-slate-200 text-center">Priložte kartu<br/><span className="text-xl text-slate-400">alebo zadajte PIN</span></p>

          <input
            ref={rfidInputRef}
            type="text"
            autoFocus
            onKeyDown={handleRfidInput}
            className="absolute opacity-0 w-0 h-0"
            tabIndex={-1}
          />

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setScreen('pin')}
              disabled={loading}
              className="px-8 py-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white text-xl font-medium transition-colors disabled:opacity-50"
            >
              Zadať PIN
            </button>
            <button
              onClick={resetToStart}
              disabled={loading}
              className="px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xl font-medium transition-colors disabled:opacity-50"
            >
              Zrušiť
            </button>
          </div>
        </div>
      )}

      {screen === 'pin' && (
        <PinPad
          onSubmit={handlePinSubmit}
          onCancel={() => { setError(null); setScreen('identify') }}
          loading={loading}
          error={error}
        />
      )}
    </div>
  )
}
