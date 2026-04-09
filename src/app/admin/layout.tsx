import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getSession } from '@/lib/get-session'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, moduly, notifCount } = await getSession()
  if (!profile) redirect('/login')

  // Must have admin-level access
  const hasAdminAccess = profile.role === 'it_admin' || profile.role === 'admin' ||
    moduly.some(m => m.pristup === 'edit' || m.pristup === 'admin')
  if (!hasAdminAccess) redirect('/')

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar profile={profile} moduly={moduly} notifCount={notifCount} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
