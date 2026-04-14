'use server'

import { requireFleetOrAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export interface VozidloVodic {
  id: string
  vozidlo_id: string
  user_id: string
  od: string
  do_dne: string | null
  primarny: boolean
  profile?: { full_name: string; email: string }
}

export async function getVodiciVozidla(vozidloId: string) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return { error: auth.error, data: [] as VozidloVodic[] }

  const { data, error } = await auth.supabase
    .from('vozidlo_vodici')
    .select('*, profile:profiles!user_id(full_name, email)')
    .eq('vozidlo_id', vozidloId)
    .order('primarny', { ascending: false })

  if (error) return { error: 'Chyba pri načítaní vodičov', data: [] as VozidloVodic[] }
  return { data: (data || []) as VozidloVodic[] }
}

export async function addVodicToVozidlo(vozidloId: string, userId: string, primarny: boolean = false) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()

  // Ak nastavujeme primárneho, najskôr existujúceho primárneho zrušíme (jeden partial unique)
  if (primarny) {
    await adminClient.from('vozidlo_vodici')
      .update({ primarny: false })
      .eq('vozidlo_id', vozidloId)
      .eq('primarny', true)
  }

  const { error } = await adminClient.from('vozidlo_vodici').insert({
    vozidlo_id: vozidloId,
    user_id: userId,
    primarny,
  })

  if (error) return { error: `Chyba: ${error.message}` }

  await logAudit('pridanie_vodica', 'vozidlo_vodici', `${vozidloId}:${userId}`, { primarny })

  revalidatePath(`/fleet/vozidla/${vozidloId}`)
  revalidatePath(`/admin/vozidla`)
}

export async function removeVodicFromVozidlo(vozidloId: string, userId: string) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('vozidlo_vodici')
    .delete()
    .eq('vozidlo_id', vozidloId)
    .eq('user_id', userId)

  if (error) return { error: 'Chyba pri odstránení vodiča' }

  await logAudit('odstranenie_vodica', 'vozidlo_vodici', `${vozidloId}:${userId}`)

  revalidatePath(`/fleet/vozidla/${vozidloId}`)
}

export async function setTachoZaznam(vozidloId: string, mesiac: string, stavKm: number, poznamka?: string) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  if (stavKm < 0) return { error: 'Stav km nemôže byť záporný' }
  if (!/^\d{4}-\d{2}$/.test(mesiac)) return { error: 'Mesiac musí byť vo formáte YYYY-MM' }

  const adminClient = createSupabaseAdmin()

  const { error } = await adminClient.from('vozidlo_tacho_zaznamy').upsert({
    vozidlo_id: vozidloId,
    mesiac,
    stav_km: stavKm,
    zapisal_id: auth.user.id,
    poznamka: poznamka || null,
  }, { onConflict: 'vozidlo_id,mesiac' })

  if (error) return { error: 'Chyba pri uložení' }

  await logAudit('tacho_zapis', 'vozidlo_tacho_zaznamy', vozidloId, { mesiac, stav_km: stavKm })

  revalidatePath(`/fleet/vozidla/${vozidloId}`)
}

export async function getMojeVozidla(userId: string) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) {
    // User si pýta sám seba — povolíme len vlastné
    const { createSupabaseServer } = await import('@/lib/supabase-server')
    const sb = await createSupabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user || user.id !== userId) return { error: 'Neoprávnené', data: [] }
    const { data } = await sb
      .from('vozidlo_vodici')
      .select('*, vozidlo:vozidla(*)')
      .eq('user_id', userId)
    return { data: data || [] }
  }
  const { data } = await auth.supabase
    .from('vozidlo_vodici')
    .select('*, vozidlo:vozidla(*)')
    .eq('user_id', userId)
  return { data: data || [] }
}
