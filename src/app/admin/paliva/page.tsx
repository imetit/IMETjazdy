import { createSupabaseServer } from '@/lib/supabase-server'
import PalivaGrid from '@/components/PalivaGrid'
import type { Paliva } from '@/lib/types'

export default async function AdminPalivaPage() {
  const supabase = await createSupabaseServer()
  const { data: paliva } = await supabase.from('paliva').select('*').single()
  return <PalivaGrid paliva={paliva as Paliva} />
}
