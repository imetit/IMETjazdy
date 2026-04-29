'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react'
import Modal from '@/components/Modal'
import { spustitKontrolu, uzavrietMesiac, prelomitUzavierku, bulkSchvalitFirmu } from '@/actions/dochadzka-uzavierka'
import type { Firma } from '@/lib/types'
import type { DochadzkaUzavierka } from '@/lib/dochadzka-types'

interface Row {
  firma: Firma
  uzavierka: DochadzkaUzavierka | null
  pocet_zamestnancov: number
  pocet_schvalenych: number
  pocet_auto_doplnenych: number
}

interface Props {
  data: Row[]
  mesiac: string
  canBreak: boolean
}

export default function UzavierkaPanel({ data, mesiac, canBreak }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [prelomFirma, setPrelomFirma] = useState<string | null>(null)
  const [prelomDovod, setPrelomDovod] = useState('')

  function action(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn()
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {data.map(({ firma, uzavierka, pocet_zamestnancov, pocet_schvalenych, pocet_auto_doplnenych }) => {
        const stav = uzavierka?.stav || 'otvoreny'
        const percent = pocet_zamestnancov > 0 ? Math.round(pocet_schvalenych / pocet_zamestnancov * 100) : 0

        return (
          <div key={firma.id} className={`border rounded-xl p-4 ${
            stav === 'uzavrety' ? 'bg-gray-50 border-gray-300' :
            stav === 'na_kontrolu' ? 'bg-yellow-50 border-yellow-300' :
            'bg-white border-gray-200'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{firma.nazov}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    stav === 'uzavrety' ? 'bg-gray-700 text-white' :
                    stav === 'na_kontrolu' ? 'bg-yellow-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {stav === 'uzavrety' ? <><Lock size={11} className="inline mr-1" />UZAVRETÝ</> :
                     stav === 'na_kontrolu' ? <><AlertTriangle size={11} className="inline mr-1" />NA KONTROLU</> :
                     <><Unlock size={11} className="inline mr-1" />OTVORENÝ</>}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                  <div>
                    <span className="text-gray-500">Schválené hodiny:</span>{' '}
                    <strong>{pocet_schvalenych} / {pocet_zamestnancov}</strong>{' '}
                    <span className="text-gray-400">({percent}%)</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Auto-doplnené:</span>{' '}
                    <strong className={pocet_auto_doplnenych > 0 ? 'text-yellow-700' : ''}>
                      {pocet_auto_doplnenych > 0 && '🤖 '}{pocet_auto_doplnenych}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Zamestnancov:</span>{' '}
                    <strong>{pocet_zamestnancov}</strong>
                  </div>
                </div>

                {uzavierka?.uzavrety_at && (
                  <div className="text-xs text-gray-500">
                    Uzavretý: {new Date(uzavierka.uzavrety_at).toLocaleString('sk-SK')}
                  </div>
                )}
                {uzavierka?.prelomenie_dovod && (
                  <div className="text-xs text-orange-700 mt-1">
                    Prelomené: {uzavierka.prelomenie_dovod}
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      stav === 'uzavrety' ? 'bg-gray-700' :
                      percent === 100 ? 'bg-green-500' :
                      percent > 50 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[160px]">
                {stav === 'otvoreny' && (
                  <button
                    onClick={() => action(() => spustitKontrolu(firma.id, mesiac))}
                    className="px-3 py-2 bg-yellow-600 text-white rounded-lg text-xs font-medium hover:bg-yellow-700"
                  >
                    Spustiť kontrolu
                  </button>
                )}
                {stav === 'na_kontrolu' && (
                  <>
                    <button
                      onClick={() => action(() => bulkSchvalitFirmu(firma.id, mesiac))}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 flex items-center justify-center gap-1"
                    >
                      <CheckCircle size={12} /> Schváliť celú firmu
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Naozaj uzavrieť mesiac? Po uzavretí nebude možné editovať záznamy (okrem IT admina).')) {
                          action(() => uzavrietMesiac(firma.id, mesiac))
                        }
                      }}
                      className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-medium hover:bg-gray-900"
                    >
                      <Lock size={11} className="inline mr-1" /> Uzavrieť mesiac
                    </button>
                  </>
                )}
                {stav === 'uzavrety' && canBreak && (
                  <button
                    onClick={() => setPrelomFirma(firma.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                  >
                    <Unlock size={11} className="inline mr-1" /> Prelomiť uzávierku
                  </button>
                )}
                {stav === 'uzavrety' && !canBreak && (
                  <span className="text-xs text-gray-400 italic">Iba IT admin</span>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {prelomFirma && (
        <Modal title="Prelomenie uzávierky" onClose={() => { setPrelomFirma(null); setPrelomDovod('') }}>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Pozor — prelomenie uzávierky umožní upravovať uzavretý mesiac. Akcia sa zaznamená do auditu.
            </p>
            <textarea value={prelomDovod} onChange={e => setPrelomDovod(e.target.value)} rows={3}
              placeholder="Dôvod prelomenia (povinný) *"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setPrelomFirma(null); setPrelomDovod('') }} className="px-4 py-2 text-sm text-gray-600">Zrušiť</button>
              <button
                onClick={() => {
                  if (!prelomFirma || !prelomDovod.trim()) return
                  action(() => prelomitUzavierku(prelomFirma, mesiac, prelomDovod))
                  setPrelomFirma(null); setPrelomDovod('')
                }}
                disabled={!prelomDovod.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                Potvrdiť prelomenie
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
