'use client'

import { Car, Wrench, AlertTriangle, TrendingUp } from 'lucide-react'
import type { FleetDashboardData } from '@/lib/fleet-types'
import { TYP_KONTROLY_LABELS } from '@/lib/fleet-types'
import { formatCurrency, formatDate } from '@/lib/fleet-utils'
import StatusIndicator from './StatusIndicator'
import Link from 'next/link'

export default function FleetDashboard({ data }: { data: FleetDashboardData }) {
  const statCards = [
    { label: 'Celkom vozidiel', value: data.celkomVozidiel, icon: Car, color: 'bg-blue-50 text-blue-600' },
    { label: 'Aktívne', value: data.aktivne, icon: Car, color: 'bg-green-50 text-green-600' },
    { label: 'V servise', value: data.vServise, icon: Wrench, color: 'bg-orange-50 text-orange-600' },
    { label: 'Nové hlásenia', value: data.noveHlasenia, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} /> Náklady na vozový park
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Tento mesiac</span>
              <span className="font-semibold">{formatCurrency(data.mesacneNaklady)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tento rok</span>
              <span className="font-semibold">{formatCurrency(data.rocneNaklady)}</span>
            </div>
          </div>

          {data.najnakladnejsie.length > 0 && (
            <>
              <h4 className="text-sm font-medium text-gray-500 mt-5 mb-2">Najnákladnejšie vozidlá</h4>
              <div className="space-y-2">
                {data.najnakladnejsie.map(item => (
                  <div key={item.vozidlo.id} className="flex justify-between text-sm">
                    <span>{item.vozidlo.znacka} {item.vozidlo.variant} ({item.vozidlo.spz})</span>
                    <span className="font-medium">{formatCurrency(item.naklady)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

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
    </div>
  )
}
