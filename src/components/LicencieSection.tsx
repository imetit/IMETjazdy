'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Key } from 'lucide-react'
import Modal from '@/components/Modal'
import type { ZamestnanecLicencia } from '@/lib/majetok-types'
import { createLicencia, updateLicencia, deleteLicencia } from '@/actions/licencie'
import { formatDate, formatCurrency, getDaysUntilExpiry } from '@/lib/fleet-utils'
import { useRouter } from 'next/navigation'

function getLicenciaStatusColor(platnostDo: string | null): string {
  if (!platnostDo) return ''
  const days = getDaysUntilExpiry(platnostDo)
  if (days < 0) return 'bg-red-100 text-red-800'
  if (days <= 30) return 'bg-orange-100 text-orange-800'
  return 'bg-green-100 text-green-800'
}

function getLicenciaStatusLabel(platnostDo: string | null): string {
  if (!platnostDo) return ''
  const days = getDaysUntilExpiry(platnostDo)
  if (days < 0) return 'Expirovaná'
  if (days <= 30) return `Expiruje o ${days} dní`
  return 'Platná'
}

interface Props {
  userId: string
  licencie: ZamestnanecLicencia[]
  readonly: boolean
  canSeePrices: boolean
}

export default function LicencieSection({ userId, licencie, readonly, canSeePrices }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ZamestnanecLicencia | null>(null)
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
      ? await updateLicencia(editItem.id, formData)
      : await createLicencia(formData)

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
    if (!confirm('Naozaj chcete zmazať túto licenciu?')) return
    await deleteLicencia(id, userId)
    router.refresh()
  }

  function openEdit(item: ZamestnanecLicencia) {
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
        <h3 className="text-lg font-semibold">Softvéry a licencie</h3>
        {!readonly && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium">
            <Plus size={16} /> Pridať
          </button>
        )}
      </div>

      {licencie.length === 0 ? (
        <p className="text-gray-500 text-sm">Žiadne licencie</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">Názov</th>
              <th className="pb-2 font-medium">Typ</th>
              {!readonly && <th className="pb-2 font-medium">Kľúč</th>}
              <th className="pb-2 font-medium">Platnosť</th>
              {canSeePrices && <th className="pb-2 font-medium text-right">Cena</th>}
              <th className="pb-2 font-medium">Stav</th>
              {!readonly && <th className="pb-2 font-medium text-right">Akcie</th>}
            </tr>
          </thead>
          <tbody>
            {licencie.map(l => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2 font-medium">
                  <span className="flex items-center gap-2"><Key size={14} className="text-gray-400" /> {l.nazov}</span>
                </td>
                <td className="py-2 text-gray-500">{l.typ || '—'}</td>
                {!readonly && <td className="py-2 text-gray-500 font-mono text-xs">{l.kluc || '—'}</td>}
                <td className="py-2 text-gray-500 text-xs">
                  {l.platnost_od && l.platnost_do
                    ? `${formatDate(l.platnost_od)} — ${formatDate(l.platnost_do)}`
                    : l.platnost_do ? `do ${formatDate(l.platnost_do)}` : '—'}
                </td>
                {canSeePrices && <td className="py-2 text-right">{l.cena ? formatCurrency(l.cena) : '—'}</td>}
                <td className="py-2">
                  {l.platnost_do && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLicenciaStatusColor(l.platnost_do)}`}>
                      {getLicenciaStatusLabel(l.platnost_do)}
                    </span>
                  )}
                </td>
                {!readonly && (
                  <td className="py-2 text-right">
                    <button onClick={() => openEdit(l)} className="p-1 text-gray-400 hover:text-primary"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(l.id)} className="p-1 text-gray-400 hover:text-red-500 ml-1"><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title={editItem ? 'Upraviť licenciu' : 'Pridať licenciu'} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Názov *</label>
              <input name="nazov" required defaultValue={editItem?.nazov || ''} placeholder="Napr. Microsoft 365 Business" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                <input name="typ" defaultValue={editItem?.typ || ''} placeholder="Napr. Office, Antivirus, VPN" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Licenčný kľúč</label>
                <input name="kluc" defaultValue={editItem?.kluc || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platnosť od</label>
                <input name="platnost_od" type="date" defaultValue={editItem?.platnost_od || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platnosť do</label>
                <input name="platnost_do" type="date" defaultValue={editItem?.platnost_do || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cena (€)</label>
              <input name="cena" type="number" step="0.01" min="0" defaultValue={editItem?.cena || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
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
