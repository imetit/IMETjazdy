'use server'

import { createSupabaseServer } from '@/lib/supabase-server'

export interface ZamestnanecJazdyReport {
  id: string
  full_name: string
  pocet_jazd: number
  celkom_km: number
  celkom_naklady: number
  rozpracovane: number
  odoslane: number
  spracovane: number
}

export async function getMesacnyJazdyReport(mesiac: string) {
  const supabase = await createSupabaseServer()

  const { data: jazdy } = await supabase
    .from('jazdy')
    .select('user_id, km, stav, naklady_celkom, profile:profiles!user_id(full_name)')
    .eq('mesiac', mesiac)

  if (!jazdy) return { data: [] }

  const map = new Map<string, ZamestnanecJazdyReport>()

  for (const j of jazdy as any[]) {
    const userId = j.user_id
    if (!map.has(userId)) {
      map.set(userId, {
        id: userId,
        full_name: j.profile?.full_name || '—',
        pocet_jazd: 0,
        celkom_km: 0,
        celkom_naklady: 0,
        rozpracovane: 0,
        odoslane: 0,
        spracovane: 0,
      })
    }
    const r = map.get(userId)!
    r.pocet_jazd++
    r.celkom_km += j.km || 0
    if (j.stav === 'spracovana') r.celkom_naklady += j.naklady_celkom || 0
    if (j.stav === 'rozpracovana') r.rozpracovane++
    if (j.stav === 'odoslana') r.odoslane++
    if (j.stav === 'spracovana') r.spracovane++
  }

  const data = Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name))

  return { data }
}

export async function getRocnyJazdyReport(rok: number) {
  const supabase = await createSupabaseServer()

  const { data: jazdy } = await supabase
    .from('jazdy')
    .select('user_id, mesiac, km, stav, naklady_celkom, profile:profiles!user_id(full_name)')
    .like('mesiac', `${rok}-%`)
    .eq('stav', 'spracovana')

  if (!jazdy) return { data: [] }

  // Aggregate by month
  const months: Record<string, { mesiac: string; pocet: number; km: number; naklady: number }> = {}

  for (const j of jazdy as any[]) {
    if (!months[j.mesiac]) {
      months[j.mesiac] = { mesiac: j.mesiac, pocet: 0, km: 0, naklady: 0 }
    }
    months[j.mesiac].pocet++
    months[j.mesiac].km += j.km || 0
    months[j.mesiac].naklady += j.naklady_celkom || 0
  }

  return { data: Object.values(months).sort((a, b) => a.mesiac.localeCompare(b.mesiac)) }
}
