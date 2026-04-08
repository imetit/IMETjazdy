import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import type { Profile } from '@/lib/types'

export default async function FleetLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  if (profile.role !== 'fleet_manager' && profile.role !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar profile={profile as Profile} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
