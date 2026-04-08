'use client'

import { useState } from 'react'
import { Car, Wrench, AlertTriangle, TrendingUp, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import type { FleetDashboardData } from '@/lib/fleet-types'
import { TYP_KONTROLY_LABELS, TYP_SERVISU_LABELS } from '@/lib/fleet-types'
import { formatCurrency, formatDate } from '@/lib/fleet-utils'
import StatusIndicator from './StatusIndicator'
import Link from 'next/link'

export default function FleetDashboard({ data }: { data: FleetDashboardData }) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const toggleCard = (key: string) => {
    setExpandedCard(expandedCard === key ? null : key)
  }

  return (
    <div className="space-y-6">
      {/* Stat cards - clickable */}
      <div className="grid grid-cols-4 gap-4">
        {/* Celkom */}
        <Link href="/fleet/vozidla" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Celkom vozidiel</p>
              <p className="text-2xl font-bold mt-1">{data.celkomVozidiel}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600"><Car size={22} /></div>
          </div>
        </Link>

        {/* Aktivne */}
        <Link href="/fleet/vozidla" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Aktívne</p>
              <p className="text-2xl font-bold mt-1">{data.aktivne}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600"><Car size={22} /></div>
          </div>
        </Link>

        {/* V servise - expandable */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-orange-300 transition-colors cursor-pointer" onClick={() => toggleCard('servis')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">V servise</p>
              <p className="text-2xl font-bold mt-1">{data.vServise}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600"><Wrench size={22} /></div>
          </div>
          {data.vServise > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
              {expandedCard === 'servis' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>Detail</span>
            </div>
          )}
        </div>

        {/* Nove hlasenia */}
        <Link href="/fleet/hlasenia" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-red-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Nové hlásenia</p>
              <p className="text-2xl font-bold mt-1">{data.noveHlasenia}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 text-red-600"><AlertTriangle size={22} /></div>
          </div>
        </Link>
      </div>

      {/* Expanded: Vehicles in service */}
      {expandedCard === 'servis' && data.vozidlaVServise.length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-5">
          <h3 className="text-sm font-semibold text-orange-800 mb-3">Vozidlá v servise</h3>
          <div className="space-y-3">
            {data.vozidlaVServise.map(v => (
              <Link key={v.id} href={`/fleet/vozidla/${v.id}`} className="flex items-start justify-between bg-white rounded-lg p-4 border border-orange-100 hover:border-orange-300 transition-colors">
                <div>
                  <p className="font-medium">{v.znacka} {v.variant} <span className="text-gray-500">({v.spz})</span></p>
                  {v.servis ? (
                    <div className="mt-1 text-sm text-gray-600">
                      <p>{TYP_SERVISU_LABELS[v.servis.typ as keyof typeof TYP_SERVISU_LABELS] || v.servis.typ}: {v.servis.popis}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(v.servis.datum)}
                        {v.servis.dodavatel && <> · {v.servis.dodavatel}</>}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mt-1">Žiadny aktívny servisný záznam</p>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 shrink-0">
                  {v.servis?.stav === 'prebieha' ? 'Prebieha' : 'Plánované'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Poistenie - PZP + Havarijne */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield size={20} /> Poistenie vozidiel
          </h3>
          {data.poistenie.length === 0 ? (
            <p className="text-gray-500 text-sm">Žiadne záznamy o poistení</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-2 font-medium">Vozidlo</th>
                    <th className="pb-2 font-medium">PZP</th>
                    <th className="pb-2 font-medium">Havarijné</th>
                  </tr>
                </thead>
                <tbody>
                  {data.poistenie.map(p => (
                    <tr key={p.vozidlo.id} className="border-b border-gray-100">
                      <td className="py-2.5">
                        <Link href={`/fleet/vozidla/${p.vozidlo.id}`} className="text-primary hover:underline font-medium">
                          {p.vozidlo.spz}
                        </Link>
                        <p className="text-xs text-gray-400">{p.vozidlo.znacka} {p.vozidlo.variant}</p>
                      </td>
                      <td className="py-2.5">
                        {p.pzp ? (
                          <div>
                            <StatusIndicator platnostDo={p.pzp.platnost_do} />
                            {p.pzp.cena && <p className="text-xs font-medium mt-0.5">{formatCurrency(p.pzp.cena)}</p>}
                            <p className="text-xs text-gray-400">do {formatDate(p.pzp.platnost_do)}</p>
                            <span className={`inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded ${p.pzp.zaplatene ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {p.pzp.zaplatene ? 'Zaplatené' : 'Nezaplatené'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {p.havarijne ? (
                          <div>
                            <StatusIndicator platnostDo={p.havarijne.platnost_do} />
                            {p.havarijne.cena && <p className="text-xs font-medium mt-0.5">{formatCurrency(p.havarijne.cena)}</p>}
                            <p className="text-xs text-gray-400">do {formatDate(p.havarijne.platnost_do)}</p>
                            <span className={`inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded ${p.havarijne.zaplatene ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {p.havarijne.zaplatene ? 'Zaplatené' : 'Nezaplatené'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Blížiace sa kontroly */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold mb-4">Blížiace sa kontroly (30 dní)</h3>
          {data.bliziaceSaKontroly.length === 0 ? (
            <p className="text-gray-500 text-sm">Žiadne blížiace sa kontroly</p>
          ) : (
            <div className="space-y-2">
              {data.bliziaceSaKontroly.map(k => (
                <Link key={k.id} href={`/fleet/vozidla/${k.vozidlo_id}`} className="flex items-center justify-between py-2 border-b border-gray-100 hover:bg-gray-50 rounded px-2 -mx-2">
                  <div>
                    <p className="text-sm font-medium">{k.vozidlo.znacka} {k.vozidlo.variant} ({k.vozidlo.spz})</p>
                    <p className="text-xs text-gray-500">{TYP_KONTROLY_LABELS[k.typ as keyof typeof TYP_KONTROLY_LABELS]} · {formatDate(k.platnost_do)}</p>
                  </div>
                  <StatusIndicator platnostDo={k.platnost_do} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Naklady */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={20} /> Náklady na vozový park
        </h3>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Tento mesiac</span>
              <span className="font-semibold text-lg">{formatCurrency(data.mesacneNaklady)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tento rok</span>
              <span className="font-semibold text-lg">{formatCurrency(data.rocneNaklady)}</span>
            </div>
          </div>

          {data.najnakladnejsie.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Najnákladnejšie vozidlá</h4>
              <div className="space-y-2">
                {data.najnakladnejsie.map((item, i) => (
                  <Link key={item.vozidlo.id} href={`/fleet/vozidla/${item.vozidlo.id}`} className="flex justify-between text-sm hover:bg-gray-50 rounded px-2 py-1 -mx-2">
                    <span className="text-gray-600">
                      <span className="text-gray-400 mr-1">{i + 1}.</span>
                      {item.vozidlo.znacka} {item.vozidlo.variant} ({item.vozidlo.spz})
                    </span>
                    <span className="font-medium">{formatCurrency(item.naklady)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
