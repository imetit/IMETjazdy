'use client'

import { useState, useMemo } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Plus, UserCheck, UserX, Search } from 'lucide-react'
import Link from 'next/link'
import Modal from './Modal'
import {
  createZamestnanec,
  toggleZamestnanecActive,
  updateZamestnanecNadriadeny,
  updateZamestnanecPin,
  updateZamestnanecFond,
  updateZamestnanecFirma,
  updateZamestnanecTypUvazku,
  updateZamestnanecEmail,
} from '@/actions/zamestnanci'
import { updateUserPozicia } from '@/actions/permissions'
import { useRouter } from 'next/navigation'
import type { Profile, Vozidlo, TypUvazku } from '@/lib/types'
import { TYP_UVAZKU_LABELS } from '@/lib/types'

type Firma = { id: string; kod: string; nazov: string }

export default function ZamestnanciTable({
  zamestnanci: initialZamestnanci, vozidla: initialVozidla, firmy: initialFirmy,
}: {
  zamestnanci: (Profile & { vozidlo?: Vozidlo | null })[]
  vozidla: Vozidlo[]
  firmy: Firma[]
}) {
  const { data } = useSWR<{ zamestnanci: (Profile & { vozidlo?: Vozidlo | null })[]; vozidla: Vozidlo[]; firmy: Firma[] }>(
    '/api/admin/zamestnanci',
    { fallbackData: { zamestnanci: initialZamestnanci, vozidla: initialVozidla, firmy: initialFirmy } },
  )
  const zamestnanci = data?.zamestnanci || initialZamestnanci
  const vozidla = data?.vozidla || initialVozidla
  const firmy = data?.firmy || initialFirmy

  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [firmaFilter, setFirmaFilter] = useState<string>('')
  const [onlyActive, setOnlyActive] = useState(true)
  const router = useRouter()

  function refreshAll() { globalMutate('/api/admin/zamestnanci'); refreshAll() }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return zamestnanci.filter(z => {
      if (onlyActive && !z.active) return false
      if (firmaFilter === '__none__' && z.firma_id) return false
      if (firmaFilter && firmaFilter !== '__none__' && z.firma_id !== firmaFilter) return false
      if (s && !`${z.full_name} ${z.email} ${z.pozicia || ''}`.toLowerCase().includes(s)) return false
      return true
    })
  }, [zamestnanci, search, firmaFilter, onlyActive])

  async function handleCreate(formData: FormData) {
    setLoading(true); setError(null)
    const result = await createZamestnanec(formData)
    if (result && 'error' in result && result.error) { setError(result.error); setLoading(false) }
    else { setShowAdd(false); setLoading(false); refreshAll() }
  }

  const firmaLabel = (id?: string | null) => {
    if (!id) return '—'
    return firmy.find(f => f.id === id)?.nazov || '—'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Zamestnanci ({filtered.length} / {zamestnanci.length})</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Pridať zamestnanca
        </button>
      </div>

      {/* Filtre */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Hľadaj meno/email/pozíciu..."
            className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={firmaFilter}
          onChange={e => setFirmaFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Všetky firmy</option>
          <option value="__none__">(bez firmy)</option>
          {firmy.map(f => <option key={f.id} value={f.id}>{f.nazov}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} />
          Iba aktívni
        </label>
      </div>

      <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-auto">
        <table className="w-full table-striped text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase">
              <th className="px-3 py-3">Meno</th>
              <th className="px-3 py-3">Firma</th>
              <th className="px-3 py-3">Pozícia</th>
              <th className="px-3 py-3">Úväzok</th>
              <th className="px-3 py-3">Rola</th>
              <th className="px-3 py-3">Fond h/týž</th>
              <th className="px-3 py-3">PIN</th>
              <th className="px-3 py-3">Nadriadený</th>
              <th className="px-3 py-3">Stav</th>
              <th className="px-3 py-3 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={10} className="text-center py-12 text-gray-400">Žiadni zamestnanci.</td></tr>}
            {filtered.map((z) => (
              <tr key={z.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-3 py-2 font-medium">
                  <Link href={`/admin/zamestnanci/${z.id}`} className="text-primary hover:underline">{z.full_name}</Link>
                  <input
                    type="email"
                    defaultValue={z.email}
                    onBlur={async (e) => {
                      const v = e.target.value.trim().toLowerCase()
                      if (!v || v === (z.email || '').toLowerCase()) { e.target.value = z.email || ''; return }
                      const res = await updateZamestnanecEmail(z.id, v)
                      if (res && 'error' in res) { alert(res.error); e.target.value = z.email || ''; return }
                      refreshAll()
                    }}
                    title="Klikni pre úpravu emailu (uloží sa pri opustení poľa)"
                    className="block w-56 text-xs text-gray-500 bg-transparent border border-transparent hover:border-gray-200 focus:border-primary focus:bg-white focus:text-gray-800 focus:outline-none rounded px-1 py-0.5 mt-0.5"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={z.firma_id || ''}
                    onChange={async (e) => { await updateZamestnanecFirma(z.id, e.target.value || null); refreshAll() }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    title={firmaLabel(z.firma_id)}
                  >
                    <option value="">—</option>
                    {firmy.map(f => <option key={f.id} value={f.id}>{f.nazov}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    defaultValue={z.pozicia || ''}
                    onBlur={async (e) => { if ((e.target.value || '') !== (z.pozicia || '')) { await updateUserPozicia(z.id, e.target.value); refreshAll() } }}
                    className="w-48 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="napr. Čašník / Udržbár…"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={z.typ_uvazku || 'tpp'}
                    onChange={async (e) => { await updateZamestnanecTypUvazku(z.id, e.target.value); refreshAll() }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {(Object.keys(TYP_UVAZKU_LABELS) as TypUvazku[]).map(k => (
                      <option key={k} value={k}>{TYP_UVAZKU_LABELS[k]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    z.role === 'it_admin' ? 'bg-purple-100 text-purple-800' :
                    z.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                    z.role === 'fin_manager' ? 'bg-indigo-100 text-indigo-800' :
                    z.role === 'fleet_manager' ? 'bg-teal-100 text-teal-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {z.role === 'it_admin' ? 'IT Admin' :
                     z.role === 'admin' ? 'Admin' :
                     z.role === 'fin_manager' ? 'Fin.' :
                     z.role === 'fleet_manager' ? 'Fleet' : 'Zam.'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.5"
                    defaultValue={z.tyzdnovy_fond_hodiny || (z.pracovny_fond_hodiny ? z.pracovny_fond_hodiny * (z.pracovne_dni_tyzdne || 5) : 42.5)}
                    onBlur={async (e) => { await updateZamestnanecFond(z.id, parseFloat(e.target.value), z.pracovne_dni_tyzdne || 5); refreshAll() }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    title="Týždňový fond"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    defaultValue={z.pin || ''}
                    onBlur={async (e) => { await updateZamestnanecPin(z.id, e.target.value); refreshAll() }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="PIN"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={z.nadriadeny_id || ''}
                    onChange={async (e) => { await updateZamestnanecNadriadeny(z.id, e.target.value || null); refreshAll() }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm max-w-40"
                  >
                    <option value="">—</option>
                    {zamestnanci.filter(n => n.id !== z.id && ['admin','fleet_manager','it_admin','fin_manager'].includes(n.role)).map(n => (
                      <option key={n.id} value={n.id}>{n.full_name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${z.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {z.active ? 'Aktívny' : 'Neakt.'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={async () => { await toggleZamestnanecActive(z.id, !z.active); refreshAll() }} className="text-gray-400 hover:text-primary p-1" title={z.active ? 'Deaktivovať' : 'Aktivovať'}>
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
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Meno *</label><input name="full_name" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Ján Novák" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input name="email" type="email" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="jan.novak@firma.sk" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Heslo *</label><input name="password" type="password" required minLength={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rola</label>
                <select name="role" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="zamestnanec">Zamestnanec</option>
                  <option value="admin">Admin</option>
                  <option value="fleet_manager">Fleet Manager</option>
                  <option value="fin_manager">Finančný manažér</option>
                  <option value="it_admin">IT Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vozidlo</label>
                <select name="vozidlo_id" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Žiadne</option>
                  {vozidla.map((v) => <option key={v.id} value={v.id}>{v.znacka} {v.variant} ({v.spz})</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm">Zrušiť</button>
              <button type="submit" disabled={loading} className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium disabled:opacity-50">Pridať</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
