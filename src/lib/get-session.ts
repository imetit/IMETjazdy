import { cache } from 'react'
import { cookies } from 'next/headers'
import { createSupabaseServer } from './supabase-server'
import type { Profile } from './types'

const ROLE_COOKIE = 'imet_role_cache'
const ROLE_TTL_MS = 5 * 60 * 1000

interface CachedRole { role: string; userId: string; ts: number }

function readCachedRole(raw: string | undefined): CachedRole | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CachedRole
    if (Date.now() - parsed.ts > ROLE_TTL_MS) return null
    return parsed
  } catch { return null }
}

// React cache() ensures this runs only ONCE per request, even if called from layout + page
export const getSession = cache(async () => {
  const [supabase, cookieStore] = await Promise.all([createSupabaseServer(), cookies()])

  const cached = readCachedRole(cookieStore.get(ROLE_COOKIE)?.value)
  const { getFirmaById } = await import('./cached-data')

  // OPTIMISTIC FAST PATH — máme cookie cache → spustíme všetko súbežne, vrátane getUser()
  // pre verifikáciu. Ak getUser() vráti iný user.id (tampered/expired cookie), spadne to
  // do null session a layout/page redirektne na /login.
  if (cached) {
    const [userResult, profileResult, modulyResult, notifCountResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('*').eq('id', cached.userId).single(),
      cached.role === 'it_admin' || cached.role === 'fin_manager'
        ? Promise.resolve({ data: null })
        : supabase.from('user_moduly').select('modul, pristup').eq('user_id', cached.userId),
      supabase.from('notifikacie')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', cached.userId)
        .eq('precitane', false),
    ])

    const user = userResult.data.user
    const profile = profileResult.data as Profile | null

    // Bezpečnostný check — verifikovaný user musí matchnúť cookie userId.
    if (!user || !profile || user.id !== cached.userId) {
      return { profile: null, firma: null, moduly: [], notifCount: 0 }
    }

    // Firma cez unstable_cache — väčšinou zero-latency hit
    const firma = profile.firma_id ? await getFirmaById(profile.firma_id) : null

    let moduly: { modul: string; pristup: string }[] = []
    if (profile.role === 'it_admin') {
      moduly = ['jazdy','vozovy_park','zamestnanecka_karta','dochadzka','dovolenky','sluzobne_cesty','archiv','admin_zamestnanci','admin_nastavenia']
        .map(m => ({ modul: m, pristup: 'admin' }))
    } else if (profile.role === 'fin_manager') {
      moduly = ['jazdy','vozovy_park','zamestnanecka_karta','dochadzka','dovolenky','sluzobne_cesty','archiv']
        .map(m => ({ modul: m, pristup: 'admin' }))
    } else {
      moduly = modulyResult.data || []
    }

    if (firma && profile.role !== 'it_admin') {
      const firmaModuly = firma.moduly_default || []
      moduly = moduly.filter(m => firmaModuly.includes(m.modul))
    }

    return { profile, firma, moduly, notifCount: notifCountResult.count || 0 }
  }

  // SLOW PATH — žiadny cache (prvý load alebo po expirácii)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { profile: null, firma: null, moduly: [], notifCount: 0 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return { profile: null, firma: null, moduly: [], notifCount: 0 }

  const [firma, modulyResult, notifCountResult] = await Promise.all([
    profile.firma_id ? getFirmaById(profile.firma_id) : Promise.resolve(null),
    profile.role === 'it_admin' || profile.role === 'fin_manager'
      ? Promise.resolve({ data: null })
      : supabase.from('user_moduly').select('modul, pristup').eq('user_id', user.id),
    supabase.from('notifikacie')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('precitane', false),
  ])

  let moduly: { modul: string; pristup: string }[] = []
  if (profile.role === 'it_admin') {
    moduly = ['jazdy','vozovy_park','zamestnanecka_karta','dochadzka','dovolenky','sluzobne_cesty','archiv','admin_zamestnanci','admin_nastavenia']
      .map(m => ({ modul: m, pristup: 'admin' }))
  } else if (profile.role === 'fin_manager') {
    moduly = ['jazdy','vozovy_park','zamestnanecka_karta','dochadzka','dovolenky','sluzobne_cesty','archiv']
      .map(m => ({ modul: m, pristup: 'admin' }))
  } else {
    moduly = modulyResult.data || []
  }

  if (firma && profile.role !== 'it_admin') {
    const firmaModuly = firma.moduly_default || []
    moduly = moduly.filter(m => firmaModuly.includes(m.modul))
  }

  return {
    profile: profile as Profile,
    firma,
    moduly,
    notifCount: notifCountResult.count || 0,
  }
})
