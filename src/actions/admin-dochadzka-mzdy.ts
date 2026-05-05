'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getAccessibleFirmaIds } from '@/lib/firma-scope'
import { detectAnomalies } from '@/lib/dochadzka-anomalies'
import { calculatePriplatky } from '@/lib/dochadzka-priplatky'
import { getCachedMesacneSumary, getCachedVPraciDnes } from '@/lib/cached-pages'
import type { MesacnySumar } from '@/lib/dochadzka-types'

function buildFirmaKey(accessible: string[] | null, explicit?: string[]): string {
  let final: string[] | null
  if (accessible === null && (!explicit || explicit.length === 0)) {
    final = null
  } else if (accessible === null) {
    final = explicit!
  } else if (!explicit || explicit.length === 0) {
    final = accessible
  } else {
    final = accessible.filter(id => explicit.includes(id))
  }
  return final === null ? '*' : final.slice().sort().join(',')
}

/**
 * Auth wrapper okolo cached compute. Auth check ~25ms, cached compute hit ~5-15ms.
 */
export async function getMesacneSumary(mesiac: string, firmaIds?: string[]): Promise<{ data?: MesacnySumar[]; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const accessible = await getAccessibleFirmaIds(auth.user.id)
  const key = buildFirmaKey(accessible, firmaIds)
  return getCachedMesacneSumary(mesiac, key)
}

/**
 * Detail jedného zamestnanca — full anomálie a príplatky. Per user, nie cachuje sa.
 */
export async function getZamestnanecDetail(userId: string, mesiac: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createSupabaseAdmin()
  const [profileRes, zaznamyRes, ziadostiRes, schvalenieRes, anomalie, priplatky] = await Promise.all([
    admin.from('profiles').select('*, firma:firma_id(kod, nazov)').eq('id', userId).single(),
    admin.from('dochadzka').select('*')
      .eq('user_id', userId)
      .gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-31`)
      .order('cas', { ascending: true }),
    admin.from('dochadzka_korekcia_ziadosti').select('*')
      .eq('user_id', userId)
      .gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-31`)
      .order('created_at', { ascending: false }),
    admin.from('dochadzka_schvalene_hodiny').select('*')
      .eq('user_id', userId).eq('mesiac', mesiac).maybeSingle(),
    detectAnomalies(userId, mesiac),
    calculatePriplatky(userId, mesiac),
  ])

  return {
    profile: profileRes.data,
    zaznamy: zaznamyRes.data || [],
    ziadosti: ziadostiRes.data || [],
    schvalenie: schvalenieRes.data,
    anomalie,
    priplatky,
  }
}

/** Aktívni zamestnanci v práci — cachované per firma_scope (30s TTL). */
export async function getVPraciDnes() {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: [] }

  const accessible = await getAccessibleFirmaIds(auth.user.id)
  const key = buildFirmaKey(accessible)
  return getCachedVPraciDnes(key)
}
