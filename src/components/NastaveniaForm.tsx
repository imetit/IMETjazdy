'use client'

import { useState } from 'react'
import { Settings, Save, Shield, Mail, Globe } from 'lucide-react'
import { updateNastavenia } from '@/actions/sadzby'
import type { Settings as SettingsType, Paliva } from '@/lib/types'
import PalivaGrid from '@/components/PalivaGrid'
import SadzbyForm from '@/components/SadzbyForm'

type Tab = 'vseobecne' | 'paliva' | 'sadzby' | 'system'

interface Props {
  settings: SettingsType
  paliva: Paliva
}

export default function NastaveniaForm({ settings, paliva }: Props) {
  const [tab, setTab] = useState<Tab>('vseobecne')
  const [saved, setSaved] = useState(false)

  async function handleSubmit(formData: FormData) {
    await updateNastavenia(formData)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'vseobecne', label: 'Všeobecné' },
    { id: 'paliva', label: 'Palivá' },
    { id: 'sadzby', label: 'Sadzby' },
    { id: 'system', label: 'Systém' },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-primary" size={24} />
        <h2 className="text-2xl font-bold text-gray-900">Nastavenia</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'vseobecne' && (
        <form action={handleSubmit} className="bg-white rounded-card shadow-sm border border-gray-100 p-6 max-w-lg">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Firma</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Názov firmy</label>
            <input name="company_name" defaultValue={settings.company_name} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Zadajte názov firmy" />
            <p className="text-xs text-gray-400 mt-1">Zobrazí sa v hlavičke PDF exportu.</p>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Posledné číslo dokladu</label>
            <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-mono inline-block">{settings.last_doc_number}</p>
          </div>
          <button type="submit" className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Save size={16} /> {saved ? 'Uložené!' : 'Uložiť'}
          </button>
        </form>
      )}

      {tab === 'paliva' && (
        <PalivaGrid paliva={paliva} />
      )}

      {tab === 'sadzby' && (
        <SadzbyForm settings={settings} />
      )}

      {tab === 'system' && (
        <div className="space-y-6 max-w-2xl">
          {/* SMTP */}
          <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail size={18} className="text-primary" />
              <h3 className="text-base font-semibold text-gray-900">Email (SMTP)</h3>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Email sa odosiela cez: <span className="font-medium">Console (placeholder)</span>
            </p>
            <p className="text-xs text-gray-500">
              Pre aktiváciu emailov nastavte SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS v env premenných.
            </p>
          </div>

          {/* IP Whitelist */}
          <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={18} className="text-primary" />
              <h3 className="text-base font-semibold text-gray-900">IP Whitelist</h3>
            </div>
            <p className="text-sm text-gray-700">
              ADMIN_IP_WHITELIST env premenná obmedzuje prístup k admin panelu.
            </p>
          </div>

          {/* 2FA */}
          <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-primary" />
              <h3 className="text-base font-semibold text-gray-900">Dvojfaktorové overenie (2FA)</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Email OTP pre admin role</p>
                <p className="text-xs text-gray-500 mt-1">Pripravené na aktiváciu</p>
              </div>
              <button
                type="button"
                disabled
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 cursor-not-allowed opacity-50"
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
