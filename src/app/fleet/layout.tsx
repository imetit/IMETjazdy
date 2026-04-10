import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getSession } from '@/lib/get-session'

export default async function FleetLayout({ children }: { children: React.ReactNode }) {
  const { profile, moduly, notifCount } = await getSession()
  if (!profile) redirect('/login')

  const hasFleet = profile.role === 'it_admin' || profile.role === 'fleet_manager' ||
    moduly.some(m => m.modul === 'vozovy_park' && (m.pristup === 'edit' || m.pristup === 'admin'))
  if (!hasFleet) redirect('/')

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar profile={profile} moduly={moduly} notifCount={notifCount} />
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-auto">{children}</main>
    </div>
  )
}
