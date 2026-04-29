import { cache } from 'react'
import { createSupabaseServer } from './supabase-server'
import type { Profile, Firma } from './types'

// React cache() ensures this runs only ONCE per request, even if called from layout + page
export const getSession = cache(async () => {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { profile: null, firma: null, moduly: [], notifCount: 0 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return { profile: null, firma: null, moduly: [], notifCount: 0 }

  // Paralelne: firma + moduly + notifCount (žiadny z nich nedependuje na ostatných)
  const [firmaResult, modulyResult, notifCountResult] = await Promise.all([
    profile.firma_id
      ? supabase.from('firmy').select('*').eq('id', profile.firma_id).single()
      : Promise.resolve({ data: null }),
    profile.role === 'it_admin' || profile.role === 'fin_manager'
      ? Promise.resolve({ data: null }) // role-based, nepotrebujeme query
      : supabase.from('user_moduly').select('modul, pristup').eq('user_id', user.id),
    supabase.from('notifikacie')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('precitane', false),
  ])

  const firma: Firma | null = (firmaResult.data as Firma) || null

  // Moduly (role-based baseline)
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

  // Clamp podľa firmy — dcérska firma s obmedzeným scopom
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
