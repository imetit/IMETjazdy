'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { brand } from '@/lib/brand'

interface Factor {
  id: string
  friendly_name?: string
  factor_type: string
  status: string
  created_at: string
}

export default function MfaEnrollClient() {
  const [factors, setFactors] = useState<Factor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollingQr, setEnrollingQr] = useState<{ id: string; qr: string; secret: string } | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function loadFactors() {
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors([...(data?.totp || []), ...(data?.phone || [])])
    setLoading(false)
  }

  useEffect(() => { loadFactors() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function startEnroll() {
    setError(null); setSuccess(null)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `${brand.shortName} 2FA (${new Date().toLocaleDateString('sk-SK')})`,
    })
    if (error) { setError(error.message); return }
    if (!data) return
    setEnrollingQr({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
  }

  async function verifyEnroll() {
    if (!enrollingQr) return
    if (!/^\d{6}$/.test(verifyCode)) { setError('Kód musí byť 6 číslic'); return }
    setError(null)
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrollingQr.id })
    if (chErr) { setError(chErr.message); return }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollingQr.id,
      challengeId: challenge.id,
      code: verifyCode,
    })
    if (vErr) { setError(vErr.message); return }
    setSuccess('2FA bolo úspešne aktivované!')
    setEnrollingQr(null); setVerifyCode('')
    await loadFactors()
  }

  async function removeFactor(factorId: string) {
    if (!confirm('Naozaj odstrániť tento 2FA faktor? Budete sa môcť prihlasovať len heslom.')) return
    setError(null)
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) { setError(error.message); return }
    setSuccess('2FA faktor odstránený')
    await loadFactors()
  }

  if (loading) return <p>Načítava sa…</p>

  return (
    <div className="space-y-6">
      {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}
      {success && <div className="p-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm">{success}</div>}

      {/* Existing factors */}
      {factors.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Aktívne faktory</h2>
          {factors.map(f => (
            <div key={f.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">{f.friendly_name || f.factor_type}</p>
                <p className="text-xs text-gray-500">{f.factor_type.toUpperCase()} · vytvorené {new Date(f.created_at).toLocaleDateString('sk-SK')} · stav: {f.status}</p>
              </div>
              <button
                onClick={() => removeFactor(f.id)}
                className="text-sm px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100"
              >
                Odstrániť
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Enroll new */}
      {!enrollingQr ? (
        <button
          onClick={startEnroll}
          className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700"
        >
          {factors.length > 0 ? 'Pridať ďalší 2FA faktor' : 'Aktivovať 2FA'}
        </button>
      ) : (
        <div className="p-4 border rounded space-y-4">
          <h2 className="font-semibold">Naskenujte QR kód</h2>
          <p className="text-sm text-gray-600">
            Otvorte aplikáciu (Google Authenticator, Authy, 1Password) a naskenujte tento QR kód.
            Potom zadajte 6-cifrový kód ktorý sa zobrazí v aplikácii.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollingQr.qr} alt="QR kód pre 2FA" className="mx-auto" width={200} height={200} />
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Nemôžete naskenovať? Zadajte secret manuálne</summary>
            <code className="block mt-2 p-2 bg-gray-100 rounded break-all">{enrollingQr.secret}</code>
          </details>
          <div className="space-y-2">
            <label className="block text-sm font-medium">6-cifrový kód z aplikácie</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              className="w-32 px-3 py-2 border rounded text-center text-lg font-mono tracking-widest"
              placeholder="000000"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={verifyEnroll}
              disabled={verifyCode.length !== 6}
              className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              Overiť a aktivovať
            </button>
            <button
              onClick={() => { setEnrollingQr(null); setVerifyCode('') }}
              className="px-4 py-2 rounded border hover:bg-gray-50"
            >
              Zrušiť
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
