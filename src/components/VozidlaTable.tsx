'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import VozidloModal from './VozidloModal'
import { deleteVozidlo } from '@/actions/vozidla'
import type { Vozidlo } from '@/lib/types'
import { PALIVO_LABELS } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'

export default function VozidlaTable({ vozidla }: { vozidla: Vozidlo[] }) {
  const [showModal, setShowModal] = useState(false)
  const [editVozidlo, setEditVozidlo] = useState<Vozidlo | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const toast = useToast()

  function handleDelete(v: Vozidlo) {
    if (!window.confirm(`Zmazať vozidlo ${v.znacka} ${v.variant} (${v.spz})?\nTáto akcia je nezvratná a uvoľní všetkých priradených vodičov.`)) return
    setDeletingId(v.id)
    startTransition(async () => {
      const r = await deleteVozidlo(v.id)
      if (r && 'error' in r && r.error) {
        toast.error(r.error)
      } else {
        toast.success(`Vozidlo ${v.spz} zmazané`)
        router.refresh()
      }
      setDeletingId(null)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Vozidlá</h2>
        <button onClick={() => { setEditVozidlo(null); setShowModal(true) }} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Pridať vozidlo
        </button>
      </div>
      <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-striped">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Značka</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Variant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ŠPZ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Druh</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Palivo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Spotreba</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Objem</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {vozidla.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">Žiadne vozidlá.</td></tr>}
              {vozidla.map((v) => (
                <tr key={v.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.znacka}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.variant}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{v.spz}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.druh === 'osobne' ? 'Osobné' : 'Nákladné'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{PALIVO_LABELS[v.palivo]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.spotreba_tp} l/100km</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.objem_motora} cm3</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditVozidlo(v); setShowModal(true) }}
                      aria-label={`Upraviť vozidlo ${v.spz}`}
                      title="Upraviť"
                      className="text-gray-400 hover:text-primary p-1 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      disabled={pending && deletingId === v.id}
                      aria-label={`Zmazať vozidlo ${v.spz}`}
                      title="Zmazať"
                      className="text-gray-400 hover:text-red-500 p-1 ml-1 transition-colors disabled:opacity-40"
                    >
                      {pending && deletingId === v.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <VozidloModal vozidlo={editVozidlo} onClose={() => setShowModal(false)} />}
    </div>
  )
}
