'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, AlertTriangle, FileDown } from 'lucide-react'
import DochadzkaEditorModal from './DochadzkaEditorModal'
import { schvalitHodinyZamestnanca, zrusitSchvalenie } from '@/actions/dochadzka-uzavierka'
import { calculateDenneOdpracovane, calculateMesacnyStav, formatMinutyNaHodiny, isPracovnyDen, isSviatok } from '@/lib/dochadzka-utils'
import type { DochadzkaZaznam, AnomalyType, PriplatkySumar, KorekciaZiadost, SchvaleneHodiny } from '@/lib/dochadzka-types'

interface ProfileLite {
  id: string
  full_name: string
  pracovny_fond_hodiny: number | null
  pozicia: string | null
  firma_id: string | null
  firma?: { kod: string; nazov: string } | null
}

interface Props {
  userId: string
  mesiac: string
  profile: ProfileLite
  zaznamy: DochadzkaZaznam[]
  ziadosti: KorekciaZiadost[]
  anomalie: AnomalyType[]
  priplatky: PriplatkySumar
  schvalenie: SchvaleneHodiny | null
}

export default function AdminDochadzkaDetailClient({ userId, mesiac, profile, zaznamy, anomalie, priplatky, schvalenie }: Props) {
  const router = useRouter()
  const [editorOpen, setEditorOpen] = useState<{ zaznam?: DochadzkaZaznam; datum: string } | null>(null)

  const [rok, m] = mesiac.split('-').map(Number)
  const fondHodiny = profile.pracovny_fond_hodiny || 8.5
  const stav = useMemo(() => calculateMesacnyStav(zaznamy, rok, m - 1, fondHodiny), [zaznamy, rok, m, fondHodiny])

  const auto_doplnene_count = zaznamy.filter(z => z.auto_doplnene).length

  // Group zaznamy podľa datumu
  const byDatum = useMemo(() => {
    const map = new Map<string, DochadzkaZaznam[]>()
    for (const z of zaznamy) {
      if (!map.has(z.datum)) map.set(z.datum, [])
      map.get(z.datum)!.push(z)
    }
    return map
  }, [zaznamy])

  const anomalieByDatum = useMemo(() => {
    const map = new Map<string, AnomalyType[]>()
    for (const a of anomalie) {
      if (!map.has(a.datum)) map.set(a.datum, [])
      map.get(a.datum)!.push(a)
    }
    return map
  }, [anomalie])

  // Render dní mesiaca
  const days: Array<{ datum: string; dt: Date; recs: DochadzkaZaznam[]; anom: AnomalyType[] }> = []
  const daysInMonth = new Date(rok, m, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(rok, m - 1, d)
    const datum = dt.toISOString().split('T')[0]
    days.push({ datum, dt, recs: byDatum.get(datum) || [], anom: anomalieByDatum.get(datum) || [] })
  }

  const dayLabels = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So']

  async function handleSchvalit() {
    if (schvalenie) {
      if (!confirm('Zrušiť schválenie hodín?')) return
      await zrusitSchvalenie(userId, mesiac)
    } else {
      await schvalitHodinyZamestnanca(userId, mesiac)
    }
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{profile.full_name}</h2>
          <p className="text-sm text-gray-500">{profile.pozicia || '—'} {profile.firma?.nazov && `· ${profile.firma.nazov}`}</p>
          <p className="text-xs text-gray-400 mt-1">Mesiac: {mesiac}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSchvalit}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              schvalenie ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            <Check size={14} className="inline mr-1" />
            {schvalenie ? 'Schválené (zrušiť)' : 'Schváliť hodiny'}
          </button>
          <a
            href={`/api/reporty/dochadzka/zamestnanec.pdf?userId=${userId}&mesiac=${mesiac}`}
            target="_blank"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <FileDown size={14} className="inline mr-1" /> PDF
          </a>
        </div>
      </div>

      {/* Sumár boxy */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <SumarBox label="Fond" value={`${Math.round(stav.fond_min / 60)}h`} />
        <SumarBox label="Odpracované" value={`${Math.floor(stav.odpracovane_min / 60)}h ${String(stav.odpracovane_min % 60).padStart(2, '0')}m`} />
        <SumarBox
          label="Rozdiel"
          value={formatMinutyNaHodiny(stav.rozdiel_min)}
          color={stav.rozdiel_min < 0 ? 'red' : stav.rozdiel_min > 0 ? 'green' : 'gray'}
        />
        <SumarBox label="Auto-doplnené" value={String(auto_doplnene_count)} color={auto_doplnene_count > 0 ? 'yellow' : 'gray'} />
        <SumarBox label="Anomálie" value={String(anomalie.length)} color={anomalie.length > 0 ? 'orange' : 'gray'} />
        <SumarBox label="Nadčasy" value={`${priplatky.nadcas_hod.toFixed(1)}h`} color="red" />
      </div>

      {/* Príplatky */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 text-sm">
        <span className="font-semibold text-gray-700">Príplatky:</span>
        <span className="ml-3">Nočná: <strong>{priplatky.nocna_hod.toFixed(1)}h</strong></span>
        <span className="ml-3">Sobota: <strong>{priplatky.sobota_hod.toFixed(1)}h</strong></span>
        <span className="ml-3">Nedeľa: <strong>{priplatky.nedela_hod.toFixed(1)}h</strong></span>
        <span className="ml-3">Sviatok: <strong>{priplatky.sviatok_hod.toFixed(1)}h</strong></span>
      </div>

      {/* Anomálie panel */}
      {anomalie.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 text-orange-800 font-semibold mb-2">
            <AlertTriangle size={16} /> Anomálie ({anomalie.length})
          </div>
          <div className="space-y-1 text-sm">
            {anomalie.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 ${a.severita === 'high' ? 'text-red-700' : a.severita === 'medium' ? 'text-orange-700' : 'text-yellow-700'}`}>
                <span className="font-mono text-xs">{a.datum}</span>
                <span>·</span>
                <span>{a.popis}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mesačný kalendár */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-32">Dátum</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Záznamy</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-24">Súčet</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-20"></th>
            </tr>
          </thead>
          <tbody>
            {days.map(({ datum, dt, recs, anom }) => {
              const isWE = dt.getDay() === 0 || dt.getDay() === 6
              const isHoliday = isSviatok(dt)
              const denneMin = calculateDenneOdpracovane(recs)
              const hasAuto = recs.some(r => r.auto_doplnene)
              return (
                <tr key={datum} className={`border-b ${isWE || isHoliday ? 'bg-gray-50/50' : ''} ${hasAuto ? 'bg-yellow-50/50' : ''} ${anom.length > 0 ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium">{dayLabels[dt.getDay()]} {dt.getDate()}.{dt.getMonth() + 1}.</div>
                    {isHoliday && <div className="text-purple-600 text-[10px]">Sviatok</div>}
                  </td>
                  <td className="px-3 py-2">
                    {recs.length === 0 ? (
                      <span className="text-gray-400 text-xs italic">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {recs.map(r => (
                          <button
                            key={r.id}
                            onClick={() => setEditorOpen({ zaznam: r, datum })}
                            className={`px-2 py-1 rounded text-xs border ${
                              r.auto_doplnene ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                              : r.smer === 'prichod' ? 'bg-green-50 border-green-200 text-green-800'
                              : 'bg-blue-50 border-blue-200 text-blue-800'
                            } hover:opacity-80`}
                          >
                            {r.auto_doplnene && '🤖 '}
                            {r.smer === 'prichod' ? '→' : '←'} {new Date(r.cas).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })} {r.dovod}
                          </button>
                        ))}
                      </div>
                    )}
                    {anom.length > 0 && (
                      <div className="mt-1 text-[11px] text-orange-700 flex items-center gap-1">
                        <AlertTriangle size={11} /> {anom.map(a => a.popis).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {denneMin > 0 ? `${Math.floor(denneMin / 60)}h ${String(denneMin % 60).padStart(2, '0')}m` : ''}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => setEditorOpen({ datum })}
                      className="text-gray-400 hover:text-primary"
                      title="Pridať záznam"
                    >
                      <Plus size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editorOpen && (
        <DochadzkaEditorModal
          zaznam={editorOpen.zaznam}
          userId={userId}
          datum={editorOpen.datum}
          onClose={() => setEditorOpen(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  )
}

function SumarBox({ label, value, color = 'gray' }: { label: string; value: string; color?: 'gray' | 'red' | 'green' | 'orange' | 'yellow' }) {
  const colors = {
    gray: 'bg-white border-gray-200 text-gray-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  }
  return (
    <div className={`border rounded-xl p-3 ${colors[color]}`}>
      <div className="text-[10px] font-semibold uppercase opacity-70">{label}</div>
      <div className="text-lg font-bold font-mono mt-0.5">{value}</div>
    </div>
  )
}
