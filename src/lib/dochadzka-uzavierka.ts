import 'server-only'
import { createSupabaseAdmin } from './supabase-admin'
import type { DochadzkaUzavierka } from './dochadzka-types'

export async function getUzavierkaStav(firmaId: string, mesiac: string): Promise<DochadzkaUzavierka | { stav: 'otvoreny' }> {
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('dochadzka_uzavierka')
    .select('*')
    .eq('firma_id', firmaId)
    .eq('mesiac', mesiac)
    .maybeSingle<DochadzkaUzavierka>()
  return data || { stav: 'otvoreny' as const }
}

export async function isUzavretyMesiac(firmaId: string | null, datum: string): Promise<boolean> {
  if (!firmaId) return false
  const stav = await getUzavierkaStav(firmaId, datum.slice(0, 7))
  return stav.stav === 'uzavrety'
}
