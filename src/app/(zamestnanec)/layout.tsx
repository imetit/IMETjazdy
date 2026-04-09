import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getSession } from '@/lib/get-session'

export default async function ZamestnanecLayout({ children }: { children: React.ReactNode }) {
  const { profile, moduly, notifCount } = await getSession()
  if (!profile) redirect('/login')

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar profile={profile} moduly={moduly} notifCount={notifCount} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
