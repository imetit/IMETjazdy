import { cache } from 'react'
import { createSupabaseServer } from './supabase-server'
import type { Profile } from './types'

// React cache() ensures this runs only ONCE per request, even if called from layout + page
export const getSession = cache(async () => {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { profile: null, moduly: [], notifCount: 0 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return { profile: null, moduly: [], notifCount: 0 }

  // Moduly
  let moduly: { modul: string; pristup: string }[] = []
  if (profile.role === 'it_admin') {
    moduly = ['jazdy','vozovy_park','zamestnanecka_karta','dochadzka','dovolenky','sluzobne_cesty','archiv','admin_zamestnanci','admin_nastavenia']
      .map(m => ({ modul: m, pristup: 'admin' }))
  } else {
    const { data } = await supabase.from('user_moduly').select('modul, pristup').eq('user_id', user.id)
    moduly = data || []
  }

  // Notification count
  const { count } = await supabase
    .from('notifikacie')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('precitane', false)

  return {
    profile: profile as Profile,
    moduly,
    notifCount: count || 0,
  }
})
