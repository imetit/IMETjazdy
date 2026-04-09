// src/app/admin/dochadzka/[userId]/page.tsx
import { getDochadzkaDetail } from '@/actions/admin-dochadzka'
import AdminDochadzkaDetail from '@/components/dochadzka/AdminDochadzkaDetail'
import { redirect } from 'next/navigation'

export default async function AdminDochadzkaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ mesiac?: string }>
}) {
  const { userId } = await params
  const { mesiac: mesiacParam } = await searchParams
  const now = new Date()
  const mesiac = mesiacParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const result = await getDochadzkaDetail(userId, mesiac)
  if (!result.profile) redirect('/admin/dochadzka')

  return (
    <AdminDochadzkaDetail
      userId={userId}
      userName={result.profile.full_name}
      fondHodiny={result.profile.pracovny_fond_hodiny || 8.5}
      zaznamy={result.zaznamy}
      mesiac={mesiac}
    />
  )
}
