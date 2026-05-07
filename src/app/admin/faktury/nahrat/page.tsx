import { redirect } from 'next/navigation'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/get-session'
import FakturaUploadForm from '@/components/faktury/FakturaUploadForm'

export default async function FakturaUploadPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const { profile } = await getSession()
  if (!profile) redirect('/login')

  const admin = createSupabaseAdmin()
  const { data: firmy } = await admin.from('firmy').select('id, kod, nazov').eq('aktivna', true).order('poradie')

  const prefill = {
    vozidlo_id: sp.vozidlo_id, servis_id: sp.servis_id, cesta_id: sp.cesta_id,
    zamestnanec_id: sp.zamestnanec_id, tankova_karta_id: sp.tankova_karta_id,
    poistna_udalost_id: sp.poistna_udalost_id, dodavatel_id: sp.dodavatel_id,
    firma_id: sp.firma_id || profile.firma_id || undefined,
    je_dobropis: !!sp.dobropis,
  }

  return <FakturaUploadForm prefill={prefill} firmy={firmy || []} />
}
