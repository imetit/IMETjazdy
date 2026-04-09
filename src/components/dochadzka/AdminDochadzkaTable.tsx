// src/components/dochadzka/AdminDochadzkaTable.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DochadzkaZaznam } from '@/lib/dochadzka-types'
import { calculateMesacnyStav, formatMinutyNaHodiny } from '@/lib/dochadzka-utils'

interface ProfileData {
  id: string
  full_name: string
  pracovny_fond_hodiny: number
}

interface VPraciData {
  user_id: string
  cas: string
  profile?: { full_name: string }
}

interface Props {
  profiles: ProfileData[]
  zaznamy: DochadzkaZaznam[]
  vPraci: VPraciData[]
  mesiac: string
  onMesiacChange: (mesiac: string) => void
}

export default function AdminDochadzkaTable({ profiles, zaznamy, vPraci, mesiac, onMesiacChange }: Props) {
  const [rok, mes] = mesiac.split('-').map(Number)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dochádzka</h2>
        <input type="month" value={mesiac} onChange={e => onMesiacChange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
      </div>

      {/* Dnes v práci */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">Dnes v práci ({vPraci.length})</h3>
        {vPraci.length === 0 ? (
          <p className="text-gray-500 text-sm">Nikto nie je v práci</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {vPraci.map((v: any, i: number) => (
              <span key={i} className="px-3 py-1.5 bg-green-50 text-green-800 rounded-full text-sm font-medium">
                {v.profile?.full_name} · {new Date(v.cas).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mesačný prehľad */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Zamestnanec</th>
              <th className="px-4 py-3 font-medium">Odpracované</th>
              <th className="px-4 py-3 font-medium">Fond</th>
              <th className="px-4 py-3 font-medium">Rozdiel</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => {
              const userZaznamy = zaznamy.filter(z => z.user_id === p.id)
              const stav = calculateMesacnyStav(userZaznamy, rok, mes - 1, p.pracovny_fond_hodiny || 8.5)
              return (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/dochadzka/${p.id}?mesiac=${mesiac}`} className="text-primary hover:underline">
                      {p.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{Math.floor(stav.odpracovane_min / 60)}h {stav.odpracovane_min % 60}min</td>
                  <td className="px-4 py-3">{Math.floor(stav.fond_min / 60)}h</td>
                  <td className="px-4 py-3">
                    <span className={stav.rozdiel_min >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {formatMinutyNaHodiny(stav.rozdiel_min)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
