'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Monitor, Smartphone, Tablet, Laptop, Package } from 'lucide-react'
import Modal from '@/components/Modal'
import type { ZamestnanecMajetok, TypMajetku } from '@/lib/majetok-types'
import { TYP_MAJETKU_LABELS, STAV_MAJETKU_LABELS } from '@/lib/majetok-types'
import { createMajetok, updateMajetok, deleteMajetok } from '@/actions/majetok'
import { formatDate, formatCurrency } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'

const TYP_ICONS: Record<TypMajetku, React.ReactNode> = {
  pc: <Laptop size={16} />,
  monitor: <Monitor size={16} />,
  telefon: <Smartphone size={16} />,
  tablet: <Tablet size={16} />,
  prislusenstvo: <Package size={16} />,
  ine: <Package size={16} />,
}

const STAV_COLORS: Record<string, string> = {
  pridelene: 'bg-green-100 text-green-800',
  vratene: 'bg-gray-100 text-gray-600',
  vyradene: 'bg-red-100 text-red-800',
}

interface Props {
  userId: string
  majetok: ZamestnanecMajetok[]
  readonly: boolean
  canSeePrices: boolean
}

export default function MajetokSection({ userId, majetok, readonly, canSeePrices }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ZamestnanecMajetok | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('user_id', userId)

    const result = editItem
      ? await updateMajetok(editItem.id, formData)
      : await createMajetok(formData)

    if (result?.error) {
      setError(result.error)
    } else {
      setShowForm(false)
      setEditItem(null)
    }
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj chcete zmazať tento záznam?')) return
    await deleteMajetok(id, userId)
    router.refresh()
  }

  function openEdit(item: ZamestnanecMajetok) {
    setEditItem(item)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditItem(null)
    setError('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">IT vybavenie</h3>
        {!readonly && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium">
            <Plus size={16} /> Pridať
          </button>
        )}
      </div>

      {majetok.length === 0 ? (
        <p className="text-gray-500 text-sm">Žiadne IT vybavenie</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">Typ</th>
              <th className="pb-2 font-medium">Názov</th>
              <th className="pb-2 font-medium">S/N</th>
              {canSeePrices && <th className="pb-2 font-medium text-right">Cena</th>}
              <th className="pb-2 font-medium">Pridelené</th>
              <th className="pb-2 font-medium">Stav</th>
              {!readonly && <th className="pb-2 font-medium text-right">Akcie</th>}
            </tr>
          </thead>
          <tbody>
            {majetok.map(m => (
              <tr key={m.id} className="border-b border-gray-100">
                <td className="py-2">
                  <span className="flex items-center gap-2 text-gray-600">
                    {TYP_ICONS[m.typ]} {TYP_MAJETKU_LABELS[m.typ]}
                  </span>
                </td>
                <td className="py-2 font-medium">{m.nazov}</td>
                <td className="py-2 text-gray-500 font-mono text-xs">{m.seriove_cislo || '—'}</td>
                {canSeePrices && <td className="py-2 text-right">{m.obstaravacia_cena ? formatCurrency(m.obstaravacia_cena) : '—'}</td>}
                <td className="py-2 text-gray-500">{m.datum_pridelenia ? formatDate(m.datum_pridelenia) : '—'}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAV_COLORS[m.stav]}`}>
                    {STAV_MAJETKU_LABELS[m.stav]}
                  </span>
                </td>
                {!readonly && (
                  <td className="py-2 text-right">
                    <button onClick={() => openEdit(m)} className="p-1 text-gray-400 hover:text-primary"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(m.id)} className="p-1 text-gray-400 hover:text-red-500 ml-1"><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title={editItem ? 'Upraviť vybavenie' : 'Pridať vybavenie'} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ *</label>
                <select name="typ" required defaultValue={editItem?.typ || 'pc'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {(Object.keys(TYP_MAJETKU_LABELS) as TypMajetku[]).map(t => (
                    <option key={t} value={t}>{TYP_MAJETKU_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
                <select name="stav" defaultValue={editItem?.stav || 'pridelene'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="pridelene">Pridelené</option>
                  <option value="vratene">Vrátené</option>
                  <option value="vyradene">Vyradené</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Názov *</label>
              <input name="nazov" required defaultValue={editItem?.nazov || ''} placeholder="Napr. Dell Latitude 5540" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sériové číslo</label>
                <input name="seriove_cislo" defaultValue={editItem?.seriove_cislo || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Obstarávacia cena (€)</label>
                <input name="obstaravacia_cena" type="number" step="0.01" min="0" defaultValue={editItem?.obstaravacia_cena || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dátum pridelenia</label>
              <input name="datum_pridelenia" type="date" defaultValue={editItem?.datum_pridelenia || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
              <textarea name="poznamka" rows={2} defaultValue={editItem?.poznamka || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Zrušiť</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                {loading ? 'Ukladám...' : editItem ? 'Uložiť' : 'Pridať'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
