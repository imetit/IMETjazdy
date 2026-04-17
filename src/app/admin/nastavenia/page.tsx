import { createSupabaseServer } from '@/lib/supabase-server'
import NastaveniaForm from '@/components/NastaveniaForm'
import type { Settings, Paliva } from '@/lib/types'

export default async function AdminNastaveniaPage() {
  const supabase = await createSupabaseServer()
  const [{ data: settings }, { data: paliva }] = await Promise.all([
    supabase.from('settings').select('*').single(),
    supabase.from('paliva').select('*').single(),
  ])
  return <NastaveniaForm settings={settings as Settings} paliva={paliva as Paliva} />
}
