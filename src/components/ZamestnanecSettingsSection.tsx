'use client'

import { useState } from 'react'
import { Settings, Key, Car, UserCheck, Clock, Briefcase, Users, Building2, Building, Calendar, AlertTriangle, Copy } from 'lucide-react'
import Modal from '@/components/Modal'
import { updateZamestnanecVozidlo, updateZamestnanecNadriadeny, updateZamestnanecPin, updateZamestnanecFond, resetZamestnanecPassword, updateZamestnanecTypUvazku, updateZamestnanecZastupuje, updateZamestnanecFirma, updateZamestnanecDatumNastupu } from '@/actions/zamestnanci'
import { updateUserPozicia } from '@/actions/permissions'
import { useRouter } from 'next/navigation'
import { TYP_UVAZKU_LABELS, type TypUvazku } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'

interface Props {
  userId: string
  currentVozidloId: string | null
  currentNadriadenyId: string | null
  currentZastupujeId: string | null
  currentTypUvazku: TypUvazku
  currentPin: string
  currentTyzdnovyFond: number
  currentPracovneDniTyzdne: number
  currentPozicia: string
  currentFirmaId: string | null
  currentDatumNastupu: string | null
  vozidla: { id: string; znacka: string; variant: string; spz: string }[]
  zamestnanci: { id: string; full_name: string; role: string }[]
  firmy: { id: string; kod: string; nazov: string }[]
}

export default function ZamestnanecSettingsSection({
  userId, currentVozidloId, currentNadriadenyId, currentZastupujeId, currentTypUvazku, currentPin, currentTyzdnovyFond, currentPracovneDniTyzdne, currentPozicia, currentFirmaId, currentDatumNastupu, vozidla, zamestnanci, firmy,
}: Props) {
  const [vozidloId, setVozidloId] = useState(currentVozidloId || '')
  const [nadriadenyId, setNadriadenyId] = useState(currentNadriadenyId || '')
  const [zastupujeId, setZastupujeId] = useState(currentZastupujeId || '')
  const [typUvazku, setTypUvazku] = useState<TypUvazku>(currentTypUvazku)
  const [pin, setPin] = useState(currentPin)
  const [tyzdnovyFond, setTyzdnovyFond] = useState(currentTyzdnovyFond)
  const [pracovneDni, setPracovneDni] = useState(currentPracovneDniTyzdne)
  const [pozicia, setPozicia] = useState(currentPozicia)
  const [firmaId, setFirmaId] = useState(currentFirmaId || '')
  const [datumNastupu, setDatumNastupu] = useState(currentDatumNastupu || '')
  const [newPassword, setNewPassword] = useState('')

  const dennyFond = (tyzdnovyFond / pracovneDni).toFixed(2)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [newPinShow, setNewPinShow] = useState<string | null>(null)
  const toast = useToast()
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

  // Filter nadriadeny options - role ktorá môže schvaľovať
  const nadriadenyOptions = zamestnanci.filter(z => ['admin', 'fleet_manager', 'it_admin', 'fin_manager'].includes(z.role))

  // Zastupujúci — ktokoľvek okrem seba
  const zastupujeOptions = zamestnanci.filter(z => z.id !== userId)

  const roleLabel = (r: string) => {
    if (r === 'it_admin') return 'IT Admin'
    if (r === 'admin') return 'Admin'
    if (r === 'fleet_manager') return 'Fleet'
    if (r === 'fin_manager') return 'Fin. manažér'
    return r
  }

  return (
    <div className="space-y-5">
      {newPinShow && (
        <Modal title="Nový PIN — zobrazí sa RAZ" onClose={() => setNewPinShow(null)} closeOnBackdrop={false}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Bezpečnostné upozornenie</p>
                <p>Tento PIN sa už nikdy nezobrazí. Skopíruj ho a odovzdaj zamestnancovi osobne alebo bezpečným kanálom (NIE emailom, NIE chatom v notifikáciach).</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 py-6 px-4 rounded-xl bg-slate-50 border border-slate-200">
              <code className="text-5xl font-mono font-bold tracking-[0.3em] text-slate-900">{newPinShow}</code>
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(newPinShow); toast.success('PIN skopírovaný do schránky') }
                  catch { toast.error('Schránka nedostupná — skopíruj manuálne') }
                }}
                aria-label="Skopírovať PIN"
                className="p-2 rounded-lg border border-slate-300 hover:bg-white transition-colors">
                <Copy size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNewPinShow(null)}
              className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors">
              Mám zaznamenaný PIN, zavrieť
            </button>
          </div>
        </Modal>
      )}
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
              <option key={z.id} value={z.id}>{z.full_name} ({roleLabel(z.role)})</option>
            ))}
          </select>
        </div>

        {/* Zastupujúci */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Users size={14} className="text-gray-400" /> Zastupujúci (počas neprítomnosti nadriadeného)
          </label>
          <select
            value={zastupujeId}
            onChange={e => { setZastupujeId(e.target.value); save('zastupuje', () => updateZamestnanecZastupuje(userId, e.target.value || null)) }}
            disabled={saving === 'zastupuje'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Žiadny zástupca</option>
            {zastupujeOptions.map(z => (
              <option key={z.id} value={z.id}>{z.full_name} ({roleLabel(z.role)})</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Keď je tento zamestnanec na schválenej dovolenke, jeho podriadení idú na zástupcu.</p>
        </div>

        {/* Typ úväzku */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Building2 size={14} className="text-gray-400" /> Typ úväzku
          </label>
          <select
            value={typUvazku}
            onChange={e => { const v = e.target.value as TypUvazku; setTypUvazku(v); save('typ_uvazku', () => updateZamestnanecTypUvazku(userId, v)) }}
            disabled={saving === 'typ_uvazku'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {(Object.keys(TYP_UVAZKU_LABELS) as TypUvazku[]).map(k => (
              <option key={k} value={k}>{TYP_UVAZKU_LABELS[k]}</option>
            ))}
          </select>
        </div>

        {/* Firma */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Building size={14} className="text-gray-400" /> Firma
          </label>
          <select
            value={firmaId}
            onChange={e => { setFirmaId(e.target.value); save('firma', () => updateZamestnanecFirma(userId, e.target.value || null)) }}
            disabled={saving === 'firma'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">—</option>
            {firmy.map(f => (
              <option key={f.id} value={f.id}>{f.nazov}</option>
            ))}
          </select>
        </div>

        {/* Dátum nástupu */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Calendar size={14} className="text-gray-400" /> Dátum nástupu
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={datumNastupu}
              onChange={e => setDatumNastupu(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              onClick={() => save('datum_nastupu', () => updateZamestnanecDatumNastupu(userId, datumNastupu || null))}
              disabled={saving === 'datum_nastupu'}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              {saving === 'datum_nastupu' ? '...' : 'Uložiť'}
            </button>
          </div>
        </div>

        {/* Pracovný fond — týždňový + dni/týždeň */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Clock size={14} className="text-gray-400" /> Pracovný fond
          </label>
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <input
                type="number"
                step="0.5"
                min="1"
                max="60"
                value={tyzdnovyFond}
                onChange={e => setTyzdnovyFond(parseFloat(e.target.value) || 42.5)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="hodín/týždeň"
              />
              <p className="text-xs text-gray-400 mt-0.5">h / týždeň</p>
            </div>
            <span className="text-gray-400 text-sm">/</span>
            <div className="w-20">
              <input
                type="number"
                min="1"
                max="7"
                value={pracovneDni}
                onChange={e => setPracovneDni(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
              />
              <p className="text-xs text-gray-400 mt-0.5">dní/týž.</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm">
              <span className="text-gray-500">= </span>
              <span className="font-semibold">{dennyFond}</span>
              <span className="text-gray-400 text-xs ml-1">h/deň</span>
            </div>
            <button
              onClick={() => save('fond', () => updateZamestnanecFond(userId, tyzdnovyFond, pracovneDni))}
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
            <button
              onClick={async () => {
                if (!confirm('Vygenerovať nový náhodný PIN? Zamestnanec dostane in-app notifikáciu (bez PIN-u — musíš mu ho odovzdať osobne alebo bezpečným kanálom).')) return
                const { resetPin } = await import('@/actions/pin-reset')
                const r = await resetPin(userId)
                if (r.error) { toast.error(r.error); return }
                if (r.pin) {
                  setPin(r.pin)
                  setNewPinShow(r.pin)  // Otvor explicitný modal — PIN sa zobrazí RAZ a musí ho admin manuálne zatvoriť
                }
              }}
              className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
              title="Vygenerovať náhodný PIN"
            >
              🎲 Reset
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
