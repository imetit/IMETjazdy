import { createSupabaseServer } from '@/lib/supabase-server'
import NastaveniaForm from '@/components/NastaveniaForm'
import ModuleHelp from '@/components/ModuleHelp'
import type { Settings, Paliva } from '@/lib/types'

export default async function AdminNastaveniaPage() {
  const supabase = await createSupabaseServer()
  const [{ data: settings }, { data: paliva }] = await Promise.all([
    supabase.from('settings').select('*').single(),
    supabase.from('paliva').select('*').single(),
  ])
  return (
    <div>
      <ModuleHelp title="Nastavenia systému">
        <p><strong>Čo tu nájdete:</strong> Všetky systémové nastavenia rozdelené do 4 tabov.</p>
        <p><strong>Všeobecné:</strong> Názov firmy, stravné sadzby, DPH, vreckové pre zahraničné cesty.</p>
        <p><strong>Palivá:</strong> Aktuálne ceny palív — používajú sa pri výpočte cestovných náhrad. Aktualizujte pravidelne.</p>
        <p><strong>Sadzby:</strong> Zákonná sadzba za km pre súkromné vozidlo (aktuálne 0,239 €/km).</p>
        <p><strong>Systém:</strong> Email (SMTP), IP whitelist, 2FA — placeholder pre budúcu konfiguráciu.</p>
      </ModuleHelp>
      <NastaveniaForm settings={settings as Settings} paliva={paliva as Paliva} />
    </div>
  )
}
