import { notFound, redirect } from 'next/navigation'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/get-session'
import FakturyPravidlaClient from '@/components/faktury/FakturyPravidlaClient'
import type { FakturyWorkflowConfig } from '@/lib/faktury-types'

export default async function FakturyPravidlaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile } = await getSession()
  if (!profile) redirect('/login')
  if (!['admin', 'it_admin', 'fin_manager'].includes(profile.role)) redirect('/')

  const admin = createSupabaseAdmin()
  const { data: firma } = await admin.from('firmy').select('id, kod, nazov, faktury_workflow').eq('id', id).maybeSingle()
  if (!firma) notFound()

  return (
    <FakturyPravidlaClient
      firma={firma as { id: string; kod: string; nazov: string; faktury_workflow: FakturyWorkflowConfig }}
    />
  )
}
