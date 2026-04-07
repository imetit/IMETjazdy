import { createSupabaseServer } from '@/lib/supabase-server'
import ZamestnanciTable from '@/components/ZamestnanciTable'
import type { Profile, Vozidlo } from '@/lib/types'

export default async function AdminZamestnanciPage() {
  const supabase = await createSupabaseServer()
  const { data: zamestnanci } = await supabase.from('profiles').select('*, vozidlo:vozidla(*)').eq('role', 'zamestnanec').order('full_name')
  const { data: vozidla } = await supabase.from('vozidla').select('*').eq('aktivne', true).order('znacka')
  return <ZamestnanciTable zamestnanci={(zamestnanci || []) as (Profile & { vozidlo?: Vozidlo | null })[]} vozidla={(vozidla || []) as Vozidlo[]} />
}
