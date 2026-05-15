import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { SkeletonSidebar, SkeletonPage } from '@/components/Skeleton'
import { getSession } from '@/lib/get-session'

export default function ZamestnanecLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-page-bg">
      <Suspense fallback={<SkeletonSidebar />}>
        <ZamSidebar />
      </Suspense>
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-auto">
        <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
      </main>
    </div>
  )
}

async function ZamSidebar() {
  const { profile, moduly, notifCount } = await getSession()
  if (!profile) redirect('/login')
  return <Sidebar profile={profile} moduly={moduly} notifCount={notifCount} />
}
