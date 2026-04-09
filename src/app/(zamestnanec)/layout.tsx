import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import type { Profile } from '@/lib/types'

export default async function ZamestnanecLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // it_admin sees everything, others get moduly from permissions table
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

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar profile={profile as Profile} moduly={moduly} notifCount={count || 0} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
