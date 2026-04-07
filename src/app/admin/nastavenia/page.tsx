import { createSupabaseServer } from '@/lib/supabase-server'
import NastaveniaForm from '@/components/NastaveniaForm'
import type { Settings } from '@/lib/types'

export default async function AdminNastaveniaPage() {
  const supabase = await createSupabaseServer()
  const { data: settings } = await supabase.from('settings').select('*').single()
  return <NastaveniaForm settings={settings as Settings} />
}
