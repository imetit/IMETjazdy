'use client'

import { useState } from 'react'
import { Settings, Key, Car, UserCheck, Clock, Briefcase } from 'lucide-react'
import { updateZamestnanecVozidlo, updateZamestnanecNadriadeny, updateZamestnanecPin, updateZamestnanecFond, resetZamestnanecPassword } from '@/actions/zamestnanci'
import { updateUserPozicia } from '@/actions/permissions'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  currentVozidloId: string | null
  currentNadriadenyId: string | null
  currentPin: string
  currentFond: number
  currentPozicia: string
  vozidla: { id: string; znacka: string; variant: string; spz: string }[]
  zamestnanci: { id: string; full_name: string; role: string }[]
}

export default function ZamestnanecSettingsSection({
  userId, currentVozidloId, currentNadriadenyId, currentPin, currentFond, currentPozicia, vozidla, zamestnanci,
}: Props) {
  const [vozidloId, setVozidloId] = useState(currentVozidloId || '')
  const [nadriadenyId, setNadriadenyId] = useState(currentNadriadenyId || '')
  const [pin, setPin] = useState(currentPin)
  const [fond, setFond] = useState(currentFond)
  const [pozicia, setPozicia] = useState(currentPozicia)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function save(field: string, fn: () => Promise<any>) {
    setSaving(field)
    setMessage(null)
    const result = await fn()
    if (result && 'error' in result && result.error) {
      setMessage(`Chyba: ${result.error}`)
    } else {
      setMessage('Uložené')
      setTimeout(() => setMessage(null), 2000)
    }
    setSaving(null)
    router.refresh()
  }

  // Filter nadriadeny options - only admin/fleet_manager/it_admin
  const nadriadenyOptions = zamestnanci.filter(z => ['admin', 'fleet_manager', 'it_admin'].includes(z.role))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-primary" />
          <h3 className="text-lg font-semibold">Nastavenia zamestnanca</h3>
        </div>
        {message && (
          <span className={`text-xs font-medium px-2 py-1 rounded ${message.startsWith('Chyba') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pozícia */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Briefcase size={14} className="text-gray-400" /> Pozícia
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pozicia}
              onChange={e => setPozicia(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="napr. Účtovníčka, Správca vozového parku..."
            />
            <button
              onClick={() => save('pozicia', () => updateUserPozicia(userId, pozicia))}
              disabled={saving === 'pozicia'}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              {saving === 'pozicia' ? '...' : 'Uložiť'}
            </button>
          </div>
        </div>

        {/* Vozidlo */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Car size={14} className="text-gray-400" /> Priradené vozidlo
          </label>
          <select
            value={vozidloId}
            onChange={e => { setVozidloId(e.target.value); save('vozidlo', () => updateZamestnanecVozidlo(userId, e.target.value || null)) }}
            disabled={saving === 'vozidlo'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Žiadne vozidlo</option>
            {vozidla.map(v => (
              <option key={v.id} value={v.id}>{v.znacka} {v.variant} ({v.spz})</option>
            ))}
          </select>
        </div>

        {/* Nadriadený */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <UserCheck size={14} className="text-gray-400" /> Nadriadený (schvaľovateľ)
          </label>
          <select
            value={nadriadenyId}
            onChange={e => { setNadriadenyId(e.target.value); save('nadriadeny', () => updateZamestnanecNadriadeny(userId, e.target.value || null)) }}
            disabled={saving === 'nadriadeny'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Žiadny nadriadený</option>
            {nadriadenyOptions.map(z => (
              <option key={z.id} value={z.id}>{z.full_name} ({z.role === 'it_admin' ? 'IT Admin' : z.role === 'admin' ? 'Admin' : 'Fleet'})</option>
            ))}
          </select>
        </div>

        {/* Pracovný fond */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Clock size={14} className="text-gray-400" /> Pracovný fond (hodiny/deň)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.5"
              min="1"
              max="24"
              value={fond}
              onChange={e => setFond(parseFloat(e.target.value) || 8.5)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              onClick={() => save('fond', () => updateZamestnanecFond(userId, fond))}
              disabled={saving === 'fond'}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              {saving === 'fond' ? '...' : 'Uložiť'}
            </button>
          </div>
        </div>

        {/* PIN */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Key size={14} className="text-gray-400" /> PIN (dochádzka)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pin}
              onChange={e => setPin(e.target.value)}
              maxLength={6}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="4-6 číslic"
            />
            <button
              onClick={() => save('pin', () => updateZamestnanecPin(userId, pin || null))}
              disabled={saving === 'pin'}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              {saving === 'pin' ? '...' : 'Uložiť'}
            </button>
          </div>
        </div>

        {/* Reset hesla */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Key size={14} className="text-gray-400" /> Reset hesla
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              minLength={6}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Nové heslo (min. 6 znakov)"
            />
            <button
              onClick={() => { if (newPassword.length >= 6) save('password', () => resetZamestnanecPassword(userId, newPassword).then(r => { if (r && !('error' in r)) setNewPassword(''); return r })) }}
              disabled={saving === 'password' || newPassword.length < 6}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving === 'password' ? '...' : 'Reset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
