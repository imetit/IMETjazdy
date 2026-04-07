import { createSupabaseServer } from '@/lib/supabase-server'
import SadzbyForm from '@/components/SadzbyForm'
import type { Settings } from '@/lib/types'

export default async function AdminSadzbyPage() {
  const supabase = await createSupabaseServer()
  const { data: settings } = await supabase.from('settings').select('*').single()
  return <SadzbyForm settings={settings as Settings} />
}
