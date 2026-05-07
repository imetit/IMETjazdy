import Link from 'next/link'
import { Plus, FileText, Ban } from 'lucide-react'
import { getFakturyList } from '@/actions/faktury'
import { FAKTURA_STAV_LABELS, FAKTURA_STAV_COLORS, formatSuma } from '@/lib/faktury-types'
import type { Faktura } from '@/lib/faktury-types'

type EntityType = 'vozidlo_id' | 'servis_id' | 'cesta_id' | 'zamestnanec_id' | 'tankova_karta_id' | 'skolenie_id' | 'poistna_udalost_id' | 'dodavatel_id'

interface Props {
  entity: EntityType
  entityId: string
  prefillUrlParams?: Record<string, string>
  title?: string
}

/**
 * Reusable server komponent — zobrazí všetky faktúry naviazané na entitu
 * (vozidlo, cestu, servis, atď.) + tlačidlo "Pridať faktúru" s pre-fillom.
 */
export default async function FakturyForEntityPanel({ entity, entityId, prefillUrlParams = {}, title = 'Faktúry' }: Props) {
  const result = await getFakturyList({ [entity]: entityId } as never)
  const faktury = ('data' in result ? result.data : []) as (Faktura & { dodavatel?: { nazov: string }; firma?: { kod: string } })[]

  const sumEur = faktury.reduce((s, f) => s + (Number(f.suma_celkom_eur || 0)), 0)
  const params = new URLSearchParams({ ...prefillUrlParams, [entity]: entityId }).toString()

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={16} /> {title}
          </h3>
          {faktury.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {faktury.length} {faktury.length === 1 ? 'záznam' : faktury.length < 5 ? 'záznamy' : 'záznamov'} · spolu {sumEur.toFixed(2)} €
            </p>
          )}
        </div>
        <Link href={`/admin/faktury/nahrat?${params}`}
          className="inline-flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded text-xs hover:opacity-90">
          <Plus size={12} /> Pridať faktúru
        </Link>
      </div>

      {faktury.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Žiadne faktúry</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Číslo</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Dodávateľ</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Suma</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Splatnosť</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Stav</th>
              </tr>
            </thead>
            <tbody>
              {faktury.map(f => (
                <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/faktury/${f.id}`} className="text-primary hover:underline font-medium">
                      {f.je_dobropis && <Ban size={11} className="inline mr-1 text-orange-500" />}
                      {f.cislo_faktury}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{f.dodavatel_nazov}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatSuma(f.suma_celkom, f.mena)}</td>
                  <td className="px-4 py-2">{f.datum_splatnosti}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FAKTURA_STAV_COLORS[f.stav]}`}>
                      {FAKTURA_STAV_LABELS[f.stav]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
