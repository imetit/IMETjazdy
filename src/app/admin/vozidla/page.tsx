import { createSupabaseServer } from '@/lib/supabase-server'
import VozidlaTable from '@/components/VozidlaTable'
import type { Vozidlo } from '@/lib/types'

export default async function AdminVozidlaPage() {
  const supabase = await createSupabaseServer()
  const { data: vozidla } = await supabase.from('vozidla').select('*').order('created_at')
  return <VozidlaTable vozidla={(vozidla || []) as Vozidlo[]} />
}
