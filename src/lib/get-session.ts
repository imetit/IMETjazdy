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

  // Firma (pre module clamp)
  let firma: Firma | null = null
  if (profile.firma_id) {
    const { data } = await supabase
      .from('firmy')
      .select('*')
      .eq('id', profile.firma_id)
      .single()
    firma = (data as Firma) || null
  }

  // Moduly (role-based baseline)
  let moduly: { modul: string; pristup: string }[] = []
  if (profile.role === 'it_admin') {
    moduly = ['jazdy','vozovy_park','zamestnanecka_karta','dochadzka','dovolenky','sluzobne_cesty','archiv','admin_zamestnanci','admin_nastavenia']
      .map(m => ({ modul: m, pristup: 'admin' }))
  } else if (profile.role === 'fin_manager') {
    moduly = ['jazdy','vozovy_park','zamestnanecka_karta','dochadzka','dovolenky','sluzobne_cesty','archiv']
      .map(m => ({ modul: m, pristup: 'admin' }))
  } else {
    const { data } = await supabase.from('user_moduly').select('modul, pristup').eq('user_id', user.id)
    moduly = data || []
  }

  // Clamp podľa firmy — dcérska firma s obmedzeným scopom
  // (it_admin NEclamp-ujeme, musí môcť všetko spravovať naprieč firmami)
  if (firma && profile.role !== 'it_admin') {
    const firmaModuly = firma.moduly_default || []
    moduly = moduly.filter(m => firmaModuly.includes(m.modul))
  }

  // Notification count
  const { count } = await supabase
    .from('notifikacie')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('precitane', false)

  return {
    profile: profile as Profile,
    firma,
    moduly,
    notifCount: count || 0,
  }
})
