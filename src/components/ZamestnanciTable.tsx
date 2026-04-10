'use client'

import { useState } from 'react'
import { Plus, UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'
import Modal from './Modal'
import { createZamestnanec, updateZamestnanecVozidlo, toggleZamestnanecActive, updateZamestnanecNadriadeny, updateZamestnanecPin, updateZamestnanecFond } from '@/actions/zamestnanci'
import type { Profile, Vozidlo } from '@/lib/types'

export default function ZamestnanciTable({ zamestnanci, vozidla }: {
  zamestnanci: (Profile & { vozidlo?: Vozidlo | null })[]; vozidla: Vozidlo[]
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(formData: FormData) {
    setLoading(true); setError(null)
    const result = await createZamestnanec(formData)
    if (result?.error) { setError(result.error); setLoading(false) }
    else { setShowAdd(false); setLoading(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Zamestnanci</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Pridať zamestnanca
        </button>
      </div>
      <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full table-striped">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Meno</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rola</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vozidlo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stav</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">PIN</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fond (h)</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nadriadený</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {zamestnanci.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-gray-400">Žiadni zamestnanci.</td></tr>}
            {zamestnanci.map((z) => (
              <tr key={z.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm font-medium">
                  <Link href={`/admin/zamestnanci/${z.id}`} className="text-primary hover:text-primary-dark hover:underline">
                    {z.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{z.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    z.role === 'it_admin' ? 'bg-purple-100 text-purple-800' :
                    z.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                    z.role === 'fleet_manager' ? 'bg-teal-100 text-teal-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {z.role === 'it_admin' ? 'IT Admin' : z.role === 'admin' ? 'Admin' : z.role === 'fleet_manager' ? 'Fleet' : 'Zamestnanec'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select value={z.vozidlo_id || ''} onChange={(e) => updateZamestnanecVozidlo(z.id, e.target.value || null)} className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Žiadne</option>
                    {vozidla.map((v) => <option key={v.id} value={v.id}>{v.znacka} {v.variant} ({v.spz})</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${z.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {z.active ? 'Aktívny' : 'Neaktívny'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    defaultValue={z.pin || ''}
                    onBlur={(e) => updateZamestnanecPin(z.id, e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="PIN"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.5"
                    defaultValue={z.pracovny_fond_hodiny || 8.5}
                    onBlur={(e) => updateZamestnanecFond(z.id, parseFloat(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    defaultValue={z.nadriadeny_id || ''}
                    onChange={(e) => updateZamestnanecNadriadeny(z.id, e.target.value || null)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Žiadny</option>
                    {zamestnanci.filter(n => n.id !== z.id && ['admin', 'fleet_manager', 'it_admin'].includes(n.role)).map(n => (
                      <option key={n.id} value={n.id}>{n.full_name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleZamestnanecActive(z.id, !z.active)} className="text-gray-400 hover:text-primary p-1 transition-colors" title={z.active ? 'Deaktivovať' : 'Aktivovať'}>
                    {z.active ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && (
        <Modal title="Pridať zamestnanca" onClose={() => setShowAdd(false)}>
          <form action={handleCreate}>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Meno *</label><input name="full_name" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Ján Novák" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input name="email" type="email" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="jan.novak@firma.sk" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Heslo *</label><input name="password" type="password" required minLength={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vozidlo</label>
                <select name="vozidlo_id" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="">Žiadne</option>
                  {vozidla.map((v) => <option key={v.id} value={v.id}>{v.znacka} {v.variant} ({v.spz})</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Zrušiť</button>
              <button type="submit" disabled={loading} className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">Pridať</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
