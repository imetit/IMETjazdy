import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import MfaEnrollClient from '@/components/auth/MfaEnrollClient'

export const metadata = {
  title: 'Dvojfaktorové overenie — IMET Jazdy',
}

export default async function MfaPage() {
  const auth = await requireAuth()
  if ('error' in auth) redirect('/login')

  // Pre admin/fin_manager/it_admin je MFA POVINNÉ — page sa zobrazí ale s warningom
  const ROLES_REQUIRING_MFA = ['admin', 'it_admin', 'fin_manager']
  const mfaRequired = ROLES_REQUIRING_MFA.includes(auth.profile.role)

  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Dvojfaktorové overenie (2FA)</h1>

      {mfaRequired && (
        <div className="mb-6 p-4 rounded-lg border border-orange-300 bg-orange-50 text-sm">
          <strong>Pre vašu rolu ({auth.profile.role}) je 2FA povinné.</strong>
          <br />
          Pokiaľ si ho neaktivujete, budete pri ďalšom prihlásení vyzvaní.
        </div>
      )}

      <p className="text-gray-700 mb-4">
        Aktivujte si 2FA pre vyššiu bezpečnosť. Pri prihlasovaní budete okrem hesla zadávať
        6-cifrový kód z aplikácie ako Google Authenticator, Authy, alebo 1Password.
      </p>

      <MfaEnrollClient />

      <div className="mt-8 text-xs text-gray-500">
        <p>
          <strong>Stratili ste prístup?</strong> Kontaktujte IT administrátora — vie 2FA
          deaktivovať v Supabase Auth dashboarde.
        </p>
      </div>
    </main>
  )
}
