'use client'

import { useState } from 'react'
import { Shield, Save } from 'lucide-react'
import { setUserModul } from '@/actions/permissions'
import type { ModulId, PristupTyp } from '@/lib/types'
import { MODUL_LABELS } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  currentRole: string
  moduly: { modul: string; pristup: string }[]
  onRoleChange: (role: string) => Promise<{ error?: string } | undefined>
}

const ALL_MODULY: ModulId[] = [
  'jazdy', 'vozovy_park', 'zamestnanecka_karta', 'dochadzka',
  'dovolenky', 'sluzobne_cesty', 'archiv', 'admin_zamestnanci', 'admin_nastavenia',
]

const PRISTUP_OPTIONS: { value: PristupTyp | ''; label: string }[] = [
  { value: '', label: 'Žiadny prístup' },
  { value: 'view', label: 'Zobrazenie' },
  { value: 'edit', label: 'Editácia' },
  { value: 'admin', label: 'Správa' },
]

const ROLE_OPTIONS = [
  { value: 'zamestnanec', label: 'Zamestnanec' },
  { value: 'admin', label: 'Admin (účtovníčka)' },
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'fin_manager', label: 'Finančný manažér' },
  { value: 'it_admin', label: 'IT Admin (plný prístup)' },
]

export default function UserPermissionsSection({ userId, currentRole, moduly, onRoleChange }: Props) {
  const [role, setRole] = useState(currentRole)
  const [loading, setLoading] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)
  const router = useRouter()

  const isItAdmin = role === 'it_admin'
  const isFinManager = role === 'fin_manager'

  const FIN_MANAGER_MODULY: ModulId[] = ['jazdy', 'vozovy_park', 'zamestnanecka_karta', 'dochadzka', 'dovolenky', 'sluzobne_cesty', 'archiv']

  function getCurrentPristup(modul: ModulId): PristupTyp | '' {
    if (isItAdmin) return 'admin'
    if (isFinManager && FIN_MANAGER_MODULY.includes(modul)) return 'admin'
    const m = moduly.find(m => m.modul === modul)
    return (m?.pristup as PristupTyp) || ''
  }

  async function handleModulChange(modul: ModulId, pristup: PristupTyp | '') {
    setLoading(modul)
    await setUserModul(userId, modul, pristup || null)
    setLoading(null)
    router.refresh()
  }

  async function handleRoleChange(newRole: string) {
    setRoleLoading(true)
    setRole(newRole)
    await onRoleChange(newRole)
    setRoleLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={20} className="text-primary" />
        <h3 className="text-lg font-semibold">Oprávnenia a moduly</h3>
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Systémová rola</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ROLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleRoleChange(opt.value)}
              disabled={roleLoading}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                role === opt.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {isItAdmin && (
          <p className="text-xs text-teal-600 mt-2">IT Admin má automaticky plný prístup ku všetkým modulom.</p>
        )}
        {isFinManager && (
          <p className="text-xs text-teal-600 mt-2">Finančný manažér má automaticky prístup ku všetkým modulom okrem správy zamestnancov a nastavení.</p>
        )}
      </div>

      {/* Module permissions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Prístup k modulom</label>
        <div className="space-y-2">
          {ALL_MODULY.map(modul => {
            const current = getCurrentPristup(modul)
            return (
              <div key={modul} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-sm font-medium text-gray-700">{MODUL_LABELS[modul]}</span>
                <div className="flex items-center gap-2">
                  {isItAdmin || (isFinManager && FIN_MANAGER_MODULY.includes(modul)) ? (
                    <span className="text-xs text-teal-600 font-medium px-2 py-1 bg-teal-50 rounded">Plný prístup</span>
                  ) : (
                    <select
                      value={current}
                      onChange={e => handleModulChange(modul, e.target.value as PristupTyp | '')}
                      disabled={loading === modul}
                      className={`px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        current === 'admin' ? 'border-teal-300 bg-teal-50 text-teal-800' :
                        current === 'edit' ? 'border-blue-300 bg-blue-50 text-blue-800' :
                        current === 'view' ? 'border-gray-300 bg-white' :
                        'border-gray-200 bg-gray-100 text-gray-400'
                      }`}
                    >
                      {PRISTUP_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                  {loading === modul && <span className="text-xs text-gray-400">...</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
