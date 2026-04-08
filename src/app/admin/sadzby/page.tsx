import { createSupabaseServer } from '@/lib/supabase-server'
import SadzbyForm from '@/components/SadzbyForm'
import HelpTip from '@/components/HelpTip'
import type { Settings } from '@/lib/types'

export default async function AdminSadzbyPage() {
  const supabase = await createSupabaseServer()
  const { data: settings } = await supabase.from('settings').select('*').single()
  return (
    <div>
      <HelpTip id="admin-sadzby" title="Sadzby cestovných náhrad">
        <p>Tu nastavujete sadzby pre výpočet cestovných náhrad podľa zákona:</p>
        <ul className="list-disc ml-4 mt-1 space-y-0.5">
          <li><strong>Stravné (doma)</strong> — podľa dĺžky cesty: do 5h, 5-12h, 12-18h, nad 18h</li>
          <li><strong>Stravné (zahraničie)</strong> — podľa dĺžky cesty: do 6h, 6-12h, nad 12h</li>
          <li><strong>Sadzba za km (súkromné auto)</strong> — náhrada za km pri použití vlastného auta</li>
          <li><strong>Vreckové</strong> — % z diét pri zahraničných cestách</li>
          <li><strong>DPH</strong> — sadzba DPH na PHM a ubytovanie</li>
        </ul>
      </HelpTip>
      <SadzbyForm settings={settings as Settings} />
    </div>
  )
}
