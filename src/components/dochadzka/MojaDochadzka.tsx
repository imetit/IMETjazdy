// src/components/dochadzka/MojaDochadzka.tsx
'use client'

import { useState } from 'react'
import { AlertCircle, FileDown, MessageCircleWarning } from 'lucide-react'
import type { DochadzkaZaznam } from '@/lib/dochadzka-types'
import { DOVOD_LABELS } from '@/lib/dochadzka-types'
import { calculateDenneOdpracovane, formatMinutyNaHodiny, isPracovnyDen, getMesacnyFond } from '@/lib/dochadzka-utils'
import { formatDate } from '@/lib/fleet-utils'
import KorekciaZiadostForm from './KorekciaZiadostForm'

interface Props {
  zaznamy: DochadzkaZaznam[]
  fondHodiny: number
  mesiac: string // "YYYY-MM"
  onMesiacChange: (mesiac: string) => void
}

export default function MojaDochadzka({ zaznamy, fondHodiny, mesiac, onMesiacChange }: Props) {
  const [rok, mes] = mesiac.split('-').map(Number)
  const [ziadostOpen, setZiadostOpen] = useState<{ datum: string; zaznamId?: string } | null>(null)
  const auto_doplnene_count = zaznamy.filter(z => z.auto_doplnene).length

  // Group by day
  const dny = new Map<string, DochadzkaZaznam[]>()
  for (const z of zaznamy) {
    if (!dny.has(z.datum)) dny.set(z.datum, [])
    dny.get(z.datum)!.push(z)
  }

  // Calculate totals
  let celkoveMin = 0
  let fajcenieMin = 0
  const denneData: { datum: string; zaznamy: DochadzkaZaznam[]; odpracovane: number }[] = []

  const daysInMonth = new Date(rok, mes, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${rok}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const denneZaznamy = dny.get(dateStr) || []
    const odpracovane = calculateDenneOdpracovane(denneZaznamy)
    celkoveMin += odpracovane

    // Count smoking
    const fajcOdchody = denneZaznamy.filter(z => z.smer === 'odchod' && z.dovod === 'fajcenie')
    for (const f of fajcOdchody) {
      const sorted = [...denneZaznamy].sort((a, b) => new Date(a.cas).getTime() - new Date(b.cas).getTime())
      const idx = sorted.indexOf(f)
      const next = sorted.slice(idx + 1).find(n => n.smer === 'prichod')
      if (next) {
        fajcenieMin += (new Date(next.cas).getTime() - new Date(f.cas).getTime()) / 60000
      }
    }

    denneData.push({ datum: dateStr, zaznamy: denneZaznamy, odpracovane })
  }

  const fondMin = getMesacnyFond(rok, mes - 1, fondHodiny)
  const rozdiel = celkoveMin - fondMin

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Moja dochádzka</h2>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={mesiac}
            onChange={e => onMesiacChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={() => setZiadostOpen({ datum: new Date().toISOString().split('T')[0] })}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100"
          >
            <MessageCircleWarning size={14} /> Nahlásiť chybu
          </button>
          <a
            href={`/api/reporty/dochadzka/zamestnanec.pdf?mesiac=${mesiac}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <FileDown size={14} /> PDF výkaz
          </a>
        </div>
      </div>

      {auto_doplnene_count > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2 text-sm">
          <AlertCircle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <strong>Auto-doplnených záznamov: {auto_doplnene_count}.</strong> Systém automaticky pripísal odchod (zabudli ste sa odpípnuť).
            Skontrolujte časy. Ak je čas iný, kliknite <button onClick={() => setZiadostOpen({ datum: new Date().toISOString().split('T')[0] })} className="underline font-semibold">Nahlásiť chybu</button> a mzdárka to opraví.
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Odpracované</p>
          <p className="text-xl font-bold">{Math.floor(celkoveMin / 60)}h {celkoveMin % 60}min</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Fond</p>
          <p className="text-xl font-bold">{Math.floor(fondMin / 60)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Rozdiel</p>
          <p className={`text-xl font-bold ${rozdiel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMinutyNaHodiny(rozdiel)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Fajčenie</p>
          <p className="text-xl font-bold text-orange-600">{Math.round(fajcenieMin)}min</p>
        </div>
      </div>

      {/* Daily table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Dátum</th>
              <th className="px-4 py-3 font-medium">Príchod</th>
              <th className="px-4 py-3 font-medium">Odchod</th>
              <th className="px-4 py-3 font-medium">Odpracované</th>
              <th className="px-4 py-3 font-medium">Dôvody</th>
            </tr>
          </thead>
          <tbody>
            {denneData.map(({ datum, zaznamy: dz, odpracovane }) => {
              const dateObj = new Date(datum)
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
              const prichody = dz.filter(z => z.smer === 'prichod').sort((a, b) => new Date(a.cas).getTime() - new Date(b.cas).getTime())
              const odchody = dz.filter(z => z.smer === 'odchod').sort((a, b) => new Date(a.cas).getTime() - new Date(b.cas).getTime())
              const dovody = [...new Set(dz.map(z => DOVOD_LABELS[z.dovod]))]

              return (
                <tr key={datum} className={`border-b border-gray-100 ${isWeekend ? 'bg-gray-50 text-gray-400' : ''}`}>
                  <td className="px-4 py-2 font-medium">
                    {formatDate(datum)}
                    <span className="text-xs text-gray-400 ml-1">
                      {dateObj.toLocaleDateString('sk-SK', { weekday: 'short' })}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 font-mono text-xs">
                    {prichody.map(p => new Date(p.cas).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600 font-mono text-xs">
                    {odchody.map(o => new Date(o.cas).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-2">
                    {odpracovane > 0 ? `${Math.floor(odpracovane / 60)}h ${odpracovane % 60}min` : '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">{dovody.join(', ') || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {ziadostOpen && (
        <KorekciaZiadostForm
          defaultDatum={ziadostOpen.datum}
          povodny_zaznam_id={ziadostOpen.zaznamId}
          onClose={() => setZiadostOpen(null)}
          onSaved={() => { setZiadostOpen(null); onMesiacChange(mesiac) }}
        />
      )}
    </div>
  )
}
