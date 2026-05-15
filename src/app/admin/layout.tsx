import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { SkeletonSidebar, SkeletonPage } from '@/components/Skeleton'
import { getSession } from '@/lib/get-session'

// Layout je čistý shell — sidebar aj content streamujú cez Suspense.
// Auth/role check už robí middleware (redirect neoprávnených na /).
// Defense-in-depth: AdminSidebar urobí session check a redirektne ak by
// niečo zlyhalo.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-page-bg">
      <Suspense fallback={<SkeletonSidebar />}>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-auto">
        <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
      </main>
    </div>
  )
}

async function AdminSidebar() {
  const { profile, moduly, notifCount } = await getSession()
  if (!profile) redirect('/login')
  const hasAdminAccess = profile.role === 'it_admin' || profile.role === 'admin' ||
    profile.role === 'fin_manager' ||
    moduly.some(m => m.pristup === 'edit' || m.pristup === 'admin')
  if (!hasAdminAccess) redirect('/')
  return <Sidebar profile={profile} moduly={moduly} notifCount={notifCount} />
}
