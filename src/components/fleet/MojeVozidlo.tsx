'use client'

import { PALIVO_LABELS, type Vozidlo } from '@/lib/types'
import { TYP_VOZIDLA_LABELS, TYP_KONTROLY_LABELS, type VozidloKontrola } from '@/lib/fleet-types'
import { formatDate } from '@/lib/fleet-utils'
import StatusIndicator from './StatusIndicator'
import Link from 'next/link'
import { Car, AlertTriangle } from 'lucide-react'

type FleetVozidlo = Vozidlo & {
  vin?: string; rok_vyroby?: number; farba?: string; typ_vozidla?: string;
  stav?: string; stredisko?: string; aktualne_km?: number;
}

interface Props {
  vozidlo: FleetVozidlo
  kontroly: VozidloKontrola[]
}

export default function MojeVozidlo({ vozidlo, kontroly }: Props) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Car size={24} /></div>
          <div>
            <h2 className="text-xl font-bold">{vozidlo.znacka} {vozidlo.variant}</h2>
            <p className="text-gray-500">{vozidlo.spz}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div><span className="text-gray-500">Typ</span><p className="font-medium">{TYP_VOZIDLA_LABELS[(vozidlo.typ_vozidla as keyof typeof TYP_VOZIDLA_LABELS) || 'osobne']}</p></div>
          <div><span className="text-gray-500">Palivo</span><p className="font-medium">{PALIVO_LABELS[vozidlo.palivo]}</p></div>
          <div><span className="text-gray-500">Rok výroby</span><p className="font-medium">{vozidlo.rok_vyroby || '—'}</p></div>
          <div><span className="text-gray-500">Farba</span><p className="font-medium">{vozidlo.farba || '—'}</p></div>
          <div><span className="text-gray-500">Aktuálne km</span><p className="font-medium">{(vozidlo.aktualne_km || 0).toLocaleString('sk-SK')} km</p></div>
          <div><span className="text-gray-500">Spotreba</span><p className="font-medium">{vozidlo.spotreba_tp} l/100km</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Platnosť kontrol</h3>
        {kontroly.length === 0 ? (
          <p className="text-gray-500 text-sm">Žiadne záznamy o kontrolách</p>
        ) : (
          <div className="space-y-3">
            {kontroly.map(k => (
              <div key={k.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-sm">{TYP_KONTROLY_LABELS[k.typ as keyof typeof TYP_KONTROLY_LABELS]}</p>
                  <p className="text-xs text-gray-500">Platnosť do: {formatDate(k.platnost_do)}</p>
                </div>
                <StatusIndicator platnostDo={k.platnost_do} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/nahlasit-problem"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
      >
        <AlertTriangle size={16} /> Nahlásiť problém s vozidlom
      </Link>
    </div>
  )
}
