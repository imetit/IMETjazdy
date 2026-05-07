'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import type { FakturyWorkflowConfig } from '@/lib/faktury-types'
import { updateFakturyWorkflow } from '@/actions/faktury-workflow'

const ROLE_OPTIONS = [
  { v: 'fin_manager', l: 'Finančný manažér firmy' },
  { v: 'admin', l: 'Admin firmy' },
  { v: 'it_admin', l: 'IT admin (globálne)' },
  { v: 'nadriadeny', l: 'Priamy nadriadený autora' },
]

export default function FakturyPravidlaClient({ firma }: { firma: { id: string; kod: string; nazov: string; faktury_workflow: FakturyWorkflowConfig } }) {
  const router = useRouter()
  const [config, setConfig] = useState<FakturyWorkflowConfig>(firma.faktury_workflow || {
    stupne: 1, limit_auto_eur: 0, schvalovatel_l1: 'fin_manager', schvalovatel_l2: 'admin', uhradzuje: 'fin_manager',
  })
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function save() {
    if (config.stupne === 2 && config.schvalovatel_l1 === config.schvalovatel_l2) {
      setError('Pri 2-stupňovom workflow nemôže byť L1 a L2 rovnaká role')
      return
    }
    setError(null)
    startTransition(async () => {
      const r = await updateFakturyWorkflow(firma.id, config)
      if ('error' in r && r.error) setError(r.error)
      else { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2000) }
    })
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-1">Pravidlá schvaľovania faktúr</h2>
      <p className="text-gray-500 mb-6">{firma.kod} — {firma.nazov}</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 mb-4 text-sm">{error}</div>}
      {saved && <div className="bg-green-50 border border-green-200 text-green-800 rounded p-3 mb-4 text-sm">Uložené</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="font-medium text-gray-700">Počet stupňov schvaľovania</label>
          <div className="mt-2 flex gap-3">
            <label className="inline-flex items-center gap-2"><input type="radio" checked={config.stupne === 1} onChange={() => setConfig({ ...config, stupne: 1 })} /> 1-stupňové</label>
            <label className="inline-flex items-center gap-2"><input type="radio" checked={config.stupne === 2} onChange={() => setConfig({ ...config, stupne: 2 })} /> 2-stupňové</label>
          </div>
        </div>

        <div>
          <label className="font-medium text-gray-700">Schvaľovateľ L1 (prvý stupeň)</label>
          <select value={config.schvalovatel_l1} onChange={e => setConfig({ ...config, schvalovatel_l1: e.target.value })}
            className="mt-1 w-full border border-gray-200 rounded p-2 text-sm">
            {ROLE_OPTIONS.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
        </div>

        {config.stupne === 2 && (
          <>
            <div>
              <label className="font-medium text-gray-700">Schvaľovateľ L2 (druhý stupeň, nad limit)</label>
              <select value={config.schvalovatel_l2} onChange={e => setConfig({ ...config, schvalovatel_l2: e.target.value })}
                className="mt-1 w-full border border-gray-200 rounded p-2 text-sm">
                {ROLE_OPTIONS.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </div>
            <div>
              <label className="font-medium text-gray-700">Limit pre auto-skip L2 (EUR)</label>
              <input type="number" step="1" value={config.limit_auto_eur}
                onChange={e => setConfig({ ...config, limit_auto_eur: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full border border-gray-200 rounded p-2 text-sm" />
              <p className="text-xs text-gray-500 mt-1">Faktúry do tejto sumy preskakujú L2 (schválené po L1).</p>
            </div>
          </>
        )}

        <div>
          <label className="font-medium text-gray-700">Kto môže označiť úhradu</label>
          <select value={config.uhradzuje} onChange={e => setConfig({ ...config, uhradzuje: e.target.value })}
            className="mt-1 w-full border border-gray-200 rounded p-2 text-sm">
            {ROLE_OPTIONS.filter(r => r.v !== 'nadriadeny').map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
        </div>

        <div className="bg-gray-50 rounded p-3 text-sm">
          <p className="font-medium mb-1">Náhľad:</p>
          <p className="text-gray-700">
            {config.stupne === 1
              ? `Faktúru schváli ${ROLE_OPTIONS.find(r => r.v === config.schvalovatel_l1)?.l || config.schvalovatel_l1}.`
              : `Faktúru schváli ${ROLE_OPTIONS.find(r => r.v === config.schvalovatel_l1)?.l}. Nad ${config.limit_auto_eur} EUR ide aj cez ${ROLE_OPTIONS.find(r => r.v === config.schvalovatel_l2)?.l}.`}
            {' '}Úhradu označuje {ROLE_OPTIONS.find(r => r.v === config.uhradzuje)?.l}.
          </p>
        </div>

        <button onClick={save} disabled={pending} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded text-sm">
          <Save size={16} /> Uložiť pravidlá
        </button>
      </div>
    </div>
  )
}
