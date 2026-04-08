'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { STAV_VOZIDLA_LABELS, TYP_VOZIDLA_LABELS } from '@/lib/fleet-types'
import { type Vozidlo } from '@/lib/types'
import VozidloFleetModal from './VozidloFleetModal'
import { createFleetVozidlo, updateFleetVozidlo } from '@/actions/fleet-vozidla'
import { useRouter } from 'next/navigation'

type FleetVozidlo = Vozidlo & {
  vin?: string; rok_vyroby?: number; farba?: string; typ_vozidla?: string;
  stav?: string; stredisko?: string; aktualne_km?: number; priradeny_vodic_id?: string;
  priradeny_vodic?: { id: string; full_name: string; email: string } | null
}

interface Props {
  vozidla: FleetVozidlo[]
  vodici: { id: string; full_name: string; email: string }[]
}

export default function FleetVozidlaTable({ vozidla, vodici }: Props) {
  const [search, setSearch] = useState('')
  const [stavFilter, setStavFilter] = useState('')
  const [modal, setModal] = useState<{ vozidlo?: FleetVozidlo } | null>(null)
  const router = useRouter()

  const filtered = vozidla.filter(v => {
    if (stavFilter && v.stav !== stavFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return v.spz.toLowerCase().includes(s) || v.znacka.toLowerCase().includes(s) || v.variant?.toLowerCase().includes(s)
    }
    return true
  })

  const stavColor = (stav?: string) => {
    switch (stav) {
      case 'aktivne': return 'bg-green-100 text-green-800'
      case 'servis': return 'bg-orange-100 text-orange-800'
      case 'vyradene': return 'bg-gray-100 text-gray-600'
      default: return 'bg-green-100 text-green-800'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Hľadať (ŠPZ, značka...)"
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm w-64"
            />
          </div>
          <select value={stavFilter} onChange={e => setStavFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Všetky stavy</option>
            {Object.entries(STAV_VOZIDLA_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <button onClick={() => setModal({})} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={16} /> Pridať vozidlo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">ŠPZ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Značka / Model</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Vodič</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Stav</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Km</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Typ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/fleet/vozidla/${v.id}`)}>
                <td className="px-4 py-3 font-medium">{v.spz}</td>
                <td className="px-4 py-3">{v.znacka} {v.variant}</td>
                <td className="px-4 py-3 text-gray-600">{v.priradeny_vodic?.full_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stavColor(v.stav)}`}>
                    {STAV_VOZIDLA_LABELS[(v.stav as keyof typeof STAV_VOZIDLA_LABELS) || 'aktivne']}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{(v.aktualne_km || 0).toLocaleString('sk-SK')}</td>
                <td className="px-4 py-3 text-gray-600">{TYP_VOZIDLA_LABELS[(v.typ_vozidla as keyof typeof TYP_VOZIDLA_LABELS) || 'osobne']}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Žiadne vozidlá</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <VozidloFleetModal
          vozidlo={modal.vozidlo}
          vodici={vodici}
          onSubmit={async (fd) => {
            if (modal.vozidlo) {
              return await updateFleetVozidlo(modal.vozidlo.id, fd)
            }
            return await createFleetVozidlo(fd)
          }}
          onClose={() => { setModal(null); router.refresh() }}
        />
      )}
    </div>
  )
}
