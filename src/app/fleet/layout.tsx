import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { SkeletonSidebar, SkeletonPage } from '@/components/Skeleton'
import { getSession } from '@/lib/get-session'

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-page-bg">
      <Suspense fallback={<SkeletonSidebar />}>
        <FleetSidebar />
      </Suspense>
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-auto">
        <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
      </main>
    </div>
  )
}

async function FleetSidebar() {
  const { profile, moduly, notifCount } = await getSession()
  if (!profile) redirect('/login')
  const hasFleet = profile.role === 'it_admin' || profile.role === 'fleet_manager' ||
    moduly.some(m => m.modul === 'vozovy_park' && (m.pristup === 'edit' || m.pristup === 'admin'))
  if (!hasFleet) redirect('/')
  return <Sidebar profile={profile} moduly={moduly} notifCount={notifCount} />
}
