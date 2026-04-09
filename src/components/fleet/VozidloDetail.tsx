'use client'

import { useState } from 'react'
import { Pencil, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PALIVO_LABELS, type Vozidlo } from '@/lib/types'
import { TYP_VOZIDLA_LABELS, STAV_VOZIDLA_LABELS, TYP_KONTROLY_LABELS, TYP_SERVISU_LABELS, STAV_SERVISU_LABELS, STAV_HLASENIA_LABELS } from '@/lib/fleet-types'
import type { VozidloDokument, VozidloServis, VozidloKontrola, KmZaznam, VozidloHlasenie, DialognicnaZnamka } from '@/lib/fleet-types'
import ZnamkySection from './ZnamkySection'
import HistoriaDrzitelov from './HistoriaDrzitelov'
import OdovzdavaciProtokolSection from './OdovzdavaciProtokol'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import StatusIndicator from './StatusIndicator'
import DokumentySection from './DokumentySection'
import KmHistoria from './KmHistoria'
import VozidloFleetModal from './VozidloFleetModal'
import { updateFleetVozidlo } from '@/actions/fleet-vozidla'
import { useRouter } from 'next/navigation'

type FleetVozidlo = Vozidlo & {
  vin?: string; rok_vyroby?: number; farba?: string; typ_vozidla?: string;
  stav?: string; stredisko?: string; aktualne_km?: number; priradeny_vodic_id?: string;
  priradeny_vodic?: { id: string; full_name: string; email: string } | null;
  obstaravacia_cena?: number; leasing_koniec?: string;
}

interface Props {
  vozidlo: FleetVozidlo
  vodici: { id: string; full_name: string; email: string }[]
  dokumenty: VozidloDokument[]
  servisy: VozidloServis[]
  kontroly: VozidloKontrola[]
  kmHistoria: KmZaznam[]
  hlasenia: VozidloHlasenie[]
  znamky: DialognicnaZnamka[]
  onUploadDokument: (formData: FormData) => Promise<{ error?: string } | undefined>
  onDeleteDokument: (id: string, filePath: string) => Promise<{ error?: string } | undefined>
  historia: any[]
  protokoly: any[]
}

type Tab = 'zakladne' | 'dokumenty' | 'servisy' | 'kontroly' | 'km' | 'hlasenia' | 'znamky' | 'historia' | 'protokoly'

export default function VozidloDetail({ vozidlo, vodici, dokumenty, servisy, kontroly, kmHistoria, hlasenia, znamky, onUploadDokument, onDeleteDokument, historia, protokoly }: Props) {
  const [tab, setTab] = useState<Tab>('zakladne')
  const [editModal, setEditModal] = useState(false)
  const router = useRouter()

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'zakladne', label: 'Základné údaje' },
    { id: 'dokumenty', label: 'Dokumenty', count: dokumenty.length },
    { id: 'servisy', label: 'Servisy', count: servisy.length },
    { id: 'kontroly', label: 'Kontroly', count: kontroly.length },
    { id: 'km', label: 'História km', count: kmHistoria.length },
    { id: 'hlasenia', label: 'Hlásenia', count: hlasenia.filter(h => h.stav === 'nove').length },
    { id: 'znamky', label: 'Diaľničné známky', count: znamky.length },
    { id: 'historia', label: 'História držiteľov', count: historia.length },
    { id: 'protokoly', label: 'Odovzdávacie protokoly', count: protokoly.length },
  ]

  const stavColor = vozidlo.stav === 'aktivne' ? 'bg-green-100 text-green-800' :
    vozidlo.stav === 'servis' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/fleet/vozidla" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold">{vozidlo.znacka} {vozidlo.variant}</h1>
            <p className="text-gray-500">{vozidlo.spz} · {(vozidlo.aktualne_km || 0).toLocaleString('sk-SK')} km</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${stavColor}`}>
            {STAV_VOZIDLA_LABELS[(vozidlo.stav as keyof typeof STAV_VOZIDLA_LABELS) || 'aktivne']}
          </span>
        </div>
        <button onClick={() => setEditModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          <Pencil size={16} /> Upraviť
        </button>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-xs">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tab === 'zakladne' && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div><span className="text-sm text-gray-500">ŠPZ</span><p className="font-medium">{vozidlo.spz}</p></div>
            <div><span className="text-sm text-gray-500">VIN</span><p className="font-medium">{vozidlo.vin || '—'}</p></div>
            <div><span className="text-sm text-gray-500">Značka</span><p className="font-medium">{vozidlo.znacka}</p></div>
            <div><span className="text-sm text-gray-500">Model</span><p className="font-medium">{vozidlo.variant || '—'}</p></div>
            <div><span className="text-sm text-gray-500">Rok výroby</span><p className="font-medium">{vozidlo.rok_vyroby || '—'}</p></div>
            <div><span className="text-sm text-gray-500">Farba</span><p className="font-medium">{vozidlo.farba || '—'}</p></div>
            <div><span className="text-sm text-gray-500">Typ</span><p className="font-medium">{TYP_VOZIDLA_LABELS[(vozidlo.typ_vozidla as keyof typeof TYP_VOZIDLA_LABELS) || 'osobne']}</p></div>
            <div><span className="text-sm text-gray-500">Palivo</span><p className="font-medium">{PALIVO_LABELS[vozidlo.palivo]}</p></div>
            <div><span className="text-sm text-gray-500">Spotreba</span><p className="font-medium">{vozidlo.spotreba_tp} l/100km</p></div>
            <div><span className="text-sm text-gray-500">Objem motora</span><p className="font-medium">{vozidlo.objem_motora} cm³</p></div>
            <div><span className="text-sm text-gray-500">Stredisko</span><p className="font-medium">{vozidlo.stredisko || '—'}</p></div>
            <div><span className="text-sm text-gray-500">Vodič</span><p className="font-medium">{vozidlo.priradeny_vodic?.full_name || '— Nepriradený —'}</p></div>
            <div><span className="text-sm text-gray-500">Obstarávacia cena</span><p className="font-medium">{vozidlo.obstaravacia_cena ? formatCurrency(vozidlo.obstaravacia_cena) : '—'}</p></div>
            <div><span className="text-sm text-gray-500">Koniec leasingu</span><p className="font-medium">{vozidlo.leasing_koniec ? formatDate(vozidlo.leasing_koniec) : '—'}</p></div>
          </div>
        )}

        {tab === 'dokumenty' && (
          <DokumentySection
            vozidloId={vozidlo.id}
            dokumenty={dokumenty}
            onUpload={onUploadDokument}
            onDelete={onDeleteDokument}
          />
        )}

        {tab === 'servisy' && (
          <div className="space-y-3">
            <Link href={`/fleet/servisy?vozidlo=${vozidlo.id}`} className="text-primary text-sm hover:underline">Zobraziť všetky servisy →</Link>
            {servisy.length === 0 ? (
              <p className="text-gray-500 text-sm">Žiadne servisy</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Dátum</th>
                  <th className="pb-2 font-medium">Typ</th>
                  <th className="pb-2 font-medium">Popis</th>
                  <th className="pb-2 font-medium text-right">Cena</th>
                  <th className="pb-2 font-medium">Stav</th>
                </tr></thead>
                <tbody>
                  {servisy.map(s => (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="py-2">{formatDate(s.datum)}</td>
                      <td className="py-2">{TYP_SERVISU_LABELS[s.typ]}</td>
                      <td className="py-2 text-gray-600 max-w-xs truncate">{s.popis}</td>
                      <td className="py-2 text-right">{s.cena ? formatCurrency(s.cena) : '—'}</td>
                      <td className="py-2">{STAV_SERVISU_LABELS[s.stav]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'kontroly' && (
          <div className="space-y-3">
            {kontroly.length === 0 ? (
              <p className="text-gray-500 text-sm">Žiadne kontroly</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Typ</th>
                  <th className="pb-2 font-medium">Dátum vykonania</th>
                  <th className="pb-2 font-medium">Platnosť do</th>
                  <th className="pb-2 font-medium">Stav</th>
                </tr></thead>
                <tbody>
                  {kontroly.map(k => (
                    <tr key={k.id} className="border-b border-gray-100">
                      <td className="py-2">{TYP_KONTROLY_LABELS[k.typ as keyof typeof TYP_KONTROLY_LABELS]}</td>
                      <td className="py-2">{formatDate(k.datum_vykonania)}</td>
                      <td className="py-2">{formatDate(k.platnost_do)}</td>
                      <td className="py-2"><StatusIndicator platnostDo={k.platnost_do} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'km' && <KmHistoria zaznamy={kmHistoria} />}

        {tab === 'znamky' && <ZnamkySection vozidloId={vozidlo.id} znamky={znamky} />}

        {tab === 'historia' && <HistoriaDrzitelov historia={historia} />}

        {tab === 'protokoly' && (
          <OdovzdavaciProtokolSection
            vozidloId={vozidlo.id}
            vozidlo={{ znacka: vozidlo.znacka, variant: vozidlo.variant, spz: vozidlo.spz, vin: vozidlo.vin || null }}
            vodici={vodici}
            aktualnyVodicId={vozidlo.priradeny_vodic_id}
            protokoly={protokoly}
          />
        )}

        {tab === 'hlasenia' && (
          <div className="space-y-3">
            {hlasenia.length === 0 ? (
              <p className="text-gray-500 text-sm">Žiadne hlásenia</p>
            ) : (
              <div className="space-y-2">
                {hlasenia.map(h => (
                  <div key={h.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm">{h.popis}</p>
                        <p className="text-xs text-gray-500 mt-1">{h.profile?.full_name} · {formatDate(h.created_at)}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        h.stav === 'nove' ? 'bg-red-100 text-red-800' :
                        h.stav === 'prebieha' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>{STAV_HLASENIA_LABELS[h.stav]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {editModal && (
        <VozidloFleetModal
          vozidlo={vozidlo}
          vodici={vodici}
          onSubmit={async (fd) => updateFleetVozidlo(vozidlo.id, fd)}
          onClose={() => { setEditModal(false); router.refresh() }}
        />
      )}
    </div>
  )
}
